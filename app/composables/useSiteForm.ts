import type { ApiSite } from '~/types/facility'

export type SiteCurrency = 'EUR' | 'GBP'

export interface SiteForm {
  name: string
  code: string
  address: string
  address_line_2: string
  city: string
  postal_code: string
  state_region: string
  country_id: number | undefined
  legal_entity_id: number | undefined
  delinquency_policy_id: number | null
  contact_email: string
  contact_phone: string
  timezone: string
  currency: SiteCurrency | null
  location_lat: number | undefined
  location_lng: number | undefined
}

function createDefaultForm(): SiteForm {
  return {
    name: '',
    code: '',
    address: '',
    address_line_2: '',
    city: '',
    postal_code: '',
    state_region: '',
    country_id: undefined,
    legal_entity_id: undefined,
    delinquency_policy_id: null,
    contact_email: '',
    contact_phone: '',
    timezone: '',
    currency: null,
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
  const currency = site.currency === 'EUR' || site.currency === 'GBP'
    ? site.currency
    : null

  return {
    name: site.name,
    code: site.code ?? '',
    address: site.address ?? '',
    address_line_2: site.address_line_2 ?? '',
    city: site.city ?? '',
    postal_code: site.postal_code ?? '',
    state_region: site.state_region ?? '',
    country_id: site.country_id ?? undefined,
    legal_entity_id: site.legal_entity_id,
    delinquency_policy_id: site.delinquency_policy_id ?? null,
    contact_email: site.contact_email ?? '',
    contact_phone: site.contact_phone ?? '',
    timezone: site.timezone ?? '',
    currency,
    location_lat: site.location?.lat,
    location_lng: site.location?.lng
  }
}

function buildPayload(form: SiteForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    timezone: form.timezone.trim()
  }

  if (form.code.trim()) {
    payload.code = form.code.trim()
  }

  if (form.address.trim()) {
    payload.address = form.address.trim()
  }

  if (form.address_line_2.trim()) {
    payload.address_line_2 = form.address_line_2.trim()
  }

  if (form.city.trim()) {
    payload.city = form.city.trim()
  }

  if (form.postal_code.trim()) {
    payload.postal_code = form.postal_code.trim()
  }

  if (form.state_region.trim()) {
    payload.state_region = form.state_region.trim()
  }

  payload.country_id = form.country_id
  payload.legal_entity_id = form.legal_entity_id
  payload.delinquency_policy_id = form.delinquency_policy_id

  if (form.contact_email.trim()) {
    payload.contact_email = form.contact_email.trim()
  }

  if (form.contact_phone.trim()) {
    payload.contact_phone = form.contact_phone.trim()
  }

  payload.currency = form.currency

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
  const fieldErrors = ref<Record<string, Array<string>>>({})

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
          errors?: Record<string, Array<string>>
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
