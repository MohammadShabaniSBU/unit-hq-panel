import type { ApiDeal, DealStatus, StayPeriod } from '~/types/deal'

export interface DealForm {
  contact_id: number | null
  site_id: number | undefined
  status: DealStatus | undefined
  expected_move_in: string
  expected_stay_length: string
  expected_stay_period: StayPeriod | undefined
  desired_size: string
  desired_unit_class_id: number | undefined
}

function createDefaultForm(): DealForm {
  return {
    contact_id: null,
    site_id: undefined,
    status: undefined,
    expected_move_in: '',
    expected_stay_length: '',
    expected_stay_period: undefined,
    desired_size: '',
    desired_unit_class_id: undefined
  }
}

function buildPayload(form: DealForm) {
  const payload: Record<string, unknown> = {
    contact_id: form.contact_id
  }

  if (form.site_id) {
    payload.site_id = form.site_id
  }

  if (form.status) {
    payload.status = form.status
  }

  if (form.expected_move_in?.trim()) {
    payload.expected_move_in = form.expected_move_in.trim()
  }

  if (form.expected_stay_length != null && form.expected_stay_length !== '') {
    payload.expected_stay_length = Number(form.expected_stay_length)
  }

  if (form.expected_stay_period) {
    payload.expected_stay_period = form.expected_stay_period
  }

  if (form.desired_size.trim()) {
    payload.desired_size = Number(form.desired_size)
  }

  if (form.desired_unit_class_id) {
    payload.desired_unit_class_id = form.desired_unit_class_id
  }

  return payload
}

export function useDealForm() {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<DealForm>(createDefaultForm())
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
      const response = await post<ApiDeal>('/api/deals', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      console.log('Deal form submission error:', err)
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}

      error.value = fetchError.data?.message ?? t('forms.deal.createErrorMessage')
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
