import type { CreateAttributePayloadItem } from '~/composables/useRequiredCreateAttributes'
import type { ApiReservation } from '~/types/reservation'

export interface ReservationForm {
  site_id: number | null
  unit_class_id: number | null
  unit_id: number | null
  contact_id: number | null
  deal_id: number | null
  expires_at: string
  note: string
}

export interface SubmitReservationResult {
  reservation: ApiReservation
  noteSaved: boolean
}

function createDefaultForm(defaults?: Partial<ReservationForm>): ReservationForm {
  return {
    site_id: null,
    unit_class_id: null,
    unit_id: null,
    contact_id: null,
    deal_id: null,
    expires_at: '',
    note: '',
    ...defaults
  }
}

function buildPayload(form: ReservationForm) {
  const payload: Record<string, unknown> = {
    site_id: form.site_id,
    unit_class_id: form.unit_class_id,
    contact_id: form.contact_id,
    expires_at: form.expires_at
  }

  if (form.unit_id) {
    payload.unit_id = form.unit_id
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

  async function submit(attributes?: Array<CreateAttributePayloadItem>) {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      if (attributes?.length) {
        payload.attributes = attributes
      }

      const response = await post<ApiReservation>('/api/reservations', payload)
      const note = form.note.trim()

      if (!note) {
        return {
          reservation: response.data,
          noteSaved: true
        }
      }

      try {
        await post('/api/notes', {
          type: 'reservation',
          id: response.data.id,
          content: note
        })

        return {
          reservation: response.data,
          noteSaved: true
        }
      } catch {
        return {
          reservation: response.data,
          noteSaved: false
        }
      }
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
