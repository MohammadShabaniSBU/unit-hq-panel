import type { ApiOffer, OfferStatus } from '~/types/offer'

export interface OfferOptionForm {
  unit_class_id: number | null
  site_id: number | null
  unit_class_rate_id: number | null
  resolved_amount: string
  resolved_currency: string
  resolved_billing_period: string
  label: string
  description: string
  display_order: number
}

export interface OfferForm {
  deal_id: number | null
  contact_id: number | null
  status: OfferStatus | undefined
  expires_at: string
  options: Array<OfferOptionForm>
}

function createDefaultOption(display_order: number): OfferOptionForm {
  return {
    unit_class_id: null,
    site_id: null,
    unit_class_rate_id: null,
    resolved_amount: '',
    resolved_currency: '',
    resolved_billing_period: '',
    label: '',
    description: '',
    display_order
  }
}

function createDefaultForm(): OfferForm {
  return {
    deal_id: null,
    contact_id: null,
    status: undefined,
    expires_at: '',
    options: []
  }
}

function buildPayload(form: OfferForm) {
  const payload: Record<string, unknown> = {
    deal_id: form.deal_id,
    contact_id: form.contact_id,
    expires_at: form.expires_at.trim()
  }

  if (form.status) {
    payload.status = form.status
  }

  const validOptions = form.options.filter(
    o => o.unit_class_rate_id !== null && o.label.trim() !== ''
  )

  if (validOptions.length > 0) {
    payload.options = validOptions.map((o, index) => ({
      unit_class_rate_id: o.unit_class_rate_id,
      label: o.label.trim(),
      description: o.description.trim() || undefined,
      display_order: index
    }))
  }

  return payload
}

export function useOfferForm() {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<OfferForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function addOption() {
    form.options.push(reactive(createDefaultOption(form.options.length)))
  }

  function removeOption(index: number) {
    form.options.splice(index, 1)
    form.options.forEach((o, i) => { o.display_order = i })
  }

  function reset() {
    const fresh = createDefaultForm()
    form.deal_id = fresh.deal_id
    form.contact_id = fresh.contact_id
    form.status = fresh.status
    form.expires_at = fresh.expires_at
    form.options.splice(0)
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiOffer>('/api/offers', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.offer.createErrorMessage')
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
    addOption,
    removeOption,
    reset,
    submit
  }
}
