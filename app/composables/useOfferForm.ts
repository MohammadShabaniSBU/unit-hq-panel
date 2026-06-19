import type { ApiOffer, OfferStatus } from '~/types/offer'

export interface OfferForm {
  deal_id: number | null
  contact_id: number | null
  status: OfferStatus | undefined
  expires_at: string
}

function createDefaultForm(): OfferForm {
  return {
    deal_id: null,
    contact_id: null,
    status: undefined,
    expires_at: ''
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

  return payload
}

export function useOfferForm() {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<OfferForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
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
    reset,
    submit
  }
}
