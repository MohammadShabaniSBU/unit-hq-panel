import type { ApiLease } from '~/types/lease'

export interface LeaseForm {
  unit_id: number | null
  contact_id: number | null
  reservation_id: number | null
  deal_id: number | null
  start_date: string
  end_date: string
  actual_rate: string
  actual_insurance: string
  signed_at: string
}

function createDefaultForm(defaults?: Partial<LeaseForm>): LeaseForm {
  return {
    unit_id: null,
    contact_id: null,
    reservation_id: null,
    deal_id: null,
    start_date: '',
    end_date: '',
    actual_rate: '',
    actual_insurance: '',
    signed_at: '',
    ...defaults
  }
}

function buildPayload(form: LeaseForm) {
  const payload: Record<string, unknown> = {
    unit_id: form.unit_id,
    contact_id: form.contact_id,
    start_date: form.start_date,
    actual_rate: Number(form.actual_rate)
  }

  if (form.reservation_id) payload.reservation_id = form.reservation_id
  if (form.deal_id) payload.deal_id = form.deal_id
  if (form.end_date.trim()) payload.end_date = form.end_date.trim()
  if (form.actual_insurance.trim()) payload.actual_insurance = Number(form.actual_insurance)
  if (form.signed_at.trim()) payload.signed_at = form.signed_at.trim()

  return payload
}

export function useLeaseForm(defaults?: Partial<LeaseForm>) {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<LeaseForm>(createDefaultForm(defaults))
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(newDefaults?: Partial<LeaseForm>) {
    Object.assign(form, createDefaultForm(newDefaults ?? defaults))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiLease>('/api/leases', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string; errors?: Record<string, Array<string>> }
      }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.lease.createErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, error, fieldErrors, reset, submit }
}
