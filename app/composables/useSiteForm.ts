import type { ApiSite } from '~/types/facility'

export interface SiteForm {
  name: string
  address: string
  city: string
  country_id: number | undefined
  contact_email: string
  contact_phone: string
  location_lat: number | undefined
  location_lng: number | undefined
}

function createDefaultForm(): SiteForm {
  return {
    name: '',
    address: '',
    city: '',
    country_id: undefined,
    contact_email: '',
    contact_phone: '',
    location_lat: undefined,
    location_lng: undefined
  }
}

function optionalNumber(value: number | undefined) {
  if (value == null || Number.isNaN(value)) {
    return undefined
  }

  return value
}

export function formFromSite(site: ApiSite): SiteForm {
  return {
    name: site.name,
    address: site.address ?? '',
    city: site.city ?? '',
    country_id: site.country_id ?? undefined,
    contact_email: site.contact_email ?? '',
    contact_phone: site.contact_phone ?? '',
    location_lat: site.location?.lat,
    location_lng: site.location?.lng
  }
}

function buildPayload(form: SiteForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim()
  }

  if (form.address.trim()) {
    payload.address = form.address.trim()
  }

  if (form.city.trim()) {
    payload.city = form.city.trim()
  }

  if (form.country_id != null) {
    payload.country_id = form.country_id
  }

  if (form.contact_email.trim()) {
    payload.contact_email = form.contact_email.trim()
  }

  if (form.contact_phone.trim()) {
    payload.contact_phone = form.contact_phone.trim()
  }

  const lat = optionalNumber(form.location_lat)
  const lng = optionalNumber(form.location_lng)

  if (lat != null && lng != null) {
    payload.location = { lat, lng }
  }

  return payload
}

export function useSiteForm() {
  const { post, put } = useApi()
  const { t } = useI18n()
  const form = reactive<SiteForm>(createDefaultForm())
  const editingSiteId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string[]>>({})

  const isEditing = computed(() => editingSiteId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingSiteId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(site: ApiSite | null) {
    reset()

    if (!site) {
      return
    }

    editingSiteId.value = site.id
    Object.assign(form, formFromSite(site))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingSiteId.value
        ? await put<ApiSite>(`/api/sites/${editingSiteId.value}`, payload)
        : await post<ApiSite>('/api/sites', payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, string[]>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        isEditing.value
          ? t('forms.site.editErrorMessage')
          : t('forms.site.createErrorMessage')
      )
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
    isEditing,
    load,
    reset,
    submit
  }
}
