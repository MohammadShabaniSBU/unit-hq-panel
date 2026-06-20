import type { ApiSiteMap } from '~/types/facility'

export interface SiteMapForm {
  floor_name: string
  sort_order: number
  svg_map: string
}

function createDefaultForm(initial?: ApiSiteMap | null): SiteMapForm {
  return {
    floor_name: initial?.floor_name ?? '',
    sort_order: initial?.sort_order ?? 0,
    svg_map: initial?.svg_map ?? ''
  }
}

function buildPayload(form: SiteMapForm) {
  return {
    floor_name: form.floor_name.trim(),
    sort_order: form.sort_order,
    svg_map: form.svg_map.trim()
  }
}

export function useSiteMaps(siteId: MaybeRefOrGetter<number>) {
  const { get } = useApi()
  const id = computed(() => toValue(siteId))

  const { data, pending, error, refresh } = useAsyncData(
    () => `site-maps-${id.value}`,
    async () => {
      const response = await get<Array<ApiSiteMap>>(`/api/sites/${id.value}/maps`)
      return response.data
    },
    { immediate: false }
  )

  const maps = computed(() => data.value ?? [])

  return {
    maps,
    pending,
    error,
    refresh
  }
}

export function useSiteMapForm(siteId: number) {
  const { post, patch, del, get } = useApi()
  const { t } = useI18n()
  const form = reactive<SiteMapForm>(createDefaultForm())
  const submitting = ref(false)
  const deleting = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(initial?: ApiSiteMap | null) {
    Object.assign(form, createDefaultForm(initial))
    error.value = null
    fieldErrors.value = {}
  }

  async function loadMap(mapId: number) {
    loading.value = true
    error.value = null

    try {
      const response = await get<ApiSiteMap>(`/api/site-maps/${mapId}`)
      reset(response.data)
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.siteMap.loadErrorMessage')
      return null
    } finally {
      loading.value = false
    }
  }

  async function submit(mapId?: number) {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = mapId
        ? await patch<ApiSiteMap>(`/api/site-maps/${mapId}`, payload)
        : await post<ApiSiteMap>(`/api/sites/${siteId}/maps`, payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        mapId
          ? t('forms.siteMap.editErrorMessage')
          : t('forms.siteMap.createErrorMessage')
      )
      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(mapId: number) {
    deleting.value = true
    error.value = null

    try {
      await del(`/api/site-maps/${mapId}`)
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.siteMap.deleteErrorMessage')
      return false
    } finally {
      deleting.value = false
    }
  }

  return {
    form,
    submitting,
    deleting,
    loading,
    error,
    fieldErrors,
    reset,
    loadMap,
    submit,
    remove
  }
}

export function useSiteMapViewer() {
  const { get } = useApi()
  const { t } = useI18n()
  const pending = ref(false)
  const error = ref<string | null>(null)
  const svgMap = ref<string | null>(null)
  const floorName = ref<string | null>(null)

  async function load(mapId: number) {
    pending.value = true
    error.value = null
    svgMap.value = null
    floorName.value = null

    try {
      const response = await get<ApiSiteMap>(`/api/site-maps/${mapId}`)
      svgMap.value = response.data.svg_map ?? null
      floorName.value = response.data.floor_name
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.siteMap.loadErrorMessage')
      return null
    } finally {
      pending.value = false
    }
  }

  function reset() {
    pending.value = false
    error.value = null
    svgMap.value = null
    floorName.value = null
  }

  return {
    pending,
    error,
    svgMap,
    floorName,
    load,
    reset
  }
}
