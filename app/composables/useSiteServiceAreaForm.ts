import type { ApiSiteServiceArea, SiteServiceAreaKind } from '~/types/facility'

export interface SiteServiceAreaForm {
  kind: SiteServiceAreaKind
  value: string
}

function createDefaultForm(): SiteServiceAreaForm {
  return {
    kind: 'postcode_prefix',
    value: ''
  }
}

export function useSiteServiceAreaForm(siteId: Ref<number> | ComputedRef<number>) {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<SiteServiceAreaForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(): Promise<ApiSiteServiceArea | null> {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiSiteServiceArea>(
        `/api/sites/${siteId.value}/service-areas`,
        {
          kind: form.kind,
          value: form.value.trim()
        }
      )

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('facility.serviceAreas.createError')
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    submitting,
    error,
    fieldErrors,
    reset,
    submit
  }
}
