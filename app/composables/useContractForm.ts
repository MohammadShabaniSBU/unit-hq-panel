import type { ApiContract } from '~/types/contract'

export interface ContractForm {
  contact_id: number | null
  reservation_id: number | null
  deal_id: number | null
  unit_id: number | null
  unit_rate: string
  insurance_id: number | null
  insurance_rate: string
  start_date: string
  end_date: string
  signed_at: string
}

function createDefaultForm(defaults?: Partial<ContractForm>): ContractForm {
  return {
    contact_id: null,
    reservation_id: null,
    deal_id: null,
    unit_id: null,
    unit_rate: '',
    insurance_id: null,
    insurance_rate: '',
    start_date: '',
    end_date: '',
    signed_at: '',
    ...defaults
  }
}

function buildPayload(form: ContractForm) {
  const items: Array<{ item_type: string; item_id: number; rate: number }> = []

  if (form.unit_id) {
    items.push({ item_type: 'unit', item_id: form.unit_id, rate: Number(form.unit_rate) })
  }

  if (form.insurance_id && form.insurance_rate.trim()) {
    items.push({ item_type: 'insurance', item_id: form.insurance_id, rate: Number(form.insurance_rate) })
  }

  const payload: Record<string, unknown> = {
    contact_id: form.contact_id,
    items
  }

  if (form.reservation_id) payload.reservation_id = form.reservation_id
  if (form.deal_id) payload.deal_id = form.deal_id
  if (form.start_date.trim()) payload.start_date = form.start_date.trim()
  if (form.end_date.trim()) payload.end_date = form.end_date.trim()
  if (form.signed_at.trim()) payload.signed_at = form.signed_at.trim()

  return payload
}

export function useContractForm(defaults?: Partial<ContractForm>) {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<ContractForm>(createDefaultForm(defaults))
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(newDefaults?: Partial<ContractForm>) {
    Object.assign(form, createDefaultForm(newDefaults ?? defaults))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiContract>('/api/contracts', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string; errors?: Record<string, Array<string>> }
      }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.contract.createErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return { form, submitting, error, fieldErrors, reset, submit }
}
