import type { ApiReservation } from '~/types/reservation'

export interface ReservationForm {
  unit_id: number | null
  contact_id: number | null
  deal_id: number | null
  expires_at: string
}

function createDefaultForm(defaults?: Partial<ReservationForm>): ReservationForm {
  return {
    unit_id: null,
    contact_id: null,
    deal_id: null,
    expires_at: '',
    ...defaults
  }
}

function buildPayload(form: ReservationForm) {
  const payload: Record<string, unknown> = {
    unit_id: form.unit_id,
    contact_id: form.contact_id,
    expires_at: form.expires_at
  }

  if (form.deal_id) {
    payload.deal_id = form.deal_id
  }

  return payload
}

export function useReservationForm(defaults?: Partial<ReservationForm>) {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<ReservationForm>(createDefaultForm(defaults))
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(newDefaults?: Partial<ReservationForm>) {
    Object.assign(form, createDefaultForm(newDefaults ?? defaults))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiReservation>('/api/reservations', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string; errors?: Record<string, Array<string>> }
      }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.reservation.createErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, error, fieldErrors, reset, submit }
}
