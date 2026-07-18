import type { ApiContract, ApiConvertPreview } from '~/types/contract'

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

function buildContractPayload(form: ContractForm) {
  const items: Array<{ item_type: string, item_id: number, rate: number }> = []

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

function buildConvertPayload(form: ContractForm) {
  const payload: Record<string, unknown> = {
    start_date: form.start_date.trim(),
    unit_rate: Number(form.unit_rate)
  }

  if (form.end_date.trim()) payload.end_date = form.end_date.trim()
  if (form.signed_at.trim()) payload.signed_at = form.signed_at.trim()

  if (form.insurance_id && form.insurance_rate.trim()) {
    payload.insurance_id = form.insurance_id
    payload.insurance_rate = Number(form.insurance_rate)
  }

  return payload
}

export function useContractForm(defaults?: Partial<ContractForm>) {
  const { get, post } = useApi()
  const { t } = useI18n()
  const form = reactive<ContractForm>(createDefaultForm(defaults))
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})
  const preview = ref<ApiConvertPreview | null>(null)
  const previewPending = ref(false)
  const previewError = ref<string | null>(null)

  function reset(newDefaults?: Partial<ContractForm>) {
    Object.assign(form, createDefaultForm(newDefaults ?? defaults))
    error.value = null
    fieldErrors.value = {}
    preview.value = null
    previewError.value = null
  }

  async function fetchConvertPreview(options?: { includeUnitRate?: boolean }) {
    if (!form.reservation_id || !form.start_date.trim()) {
      preview.value = null
      return null
    }

    previewPending.value = true
    previewError.value = null

    try {
      const query: Record<string, string | number> = {
        start_date: form.start_date.trim()
      }

      if (options?.includeUnitRate !== false && form.unit_rate.trim()) {
        query.unit_rate = form.unit_rate.trim()
      }

      if (form.insurance_id && form.insurance_rate.trim()) {
        query.insurance_id = form.insurance_id
        query.insurance_rate = form.insurance_rate.trim()
      }

      const response = await get<ApiConvertPreview>(
        `/api/reservations/${form.reservation_id}/convert-preview`,
        query
      )
      preview.value = response.data
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string, errors?: Record<string, Array<string>> }
      }
      preview.value = null
      previewError.value = fetchError.data?.message ?? t('forms.contract.previewErrorMessage')
      return null
    } finally {
      previewPending.value = false
    }
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      if (form.reservation_id) {
        const response = await post<ApiContract>(
          `/api/reservations/${form.reservation_id}/convert`,
          buildConvertPayload(form)
        )
        return response.data
      }

      const response = await post<ApiContract>('/api/contracts', buildContractPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string, errors?: Record<string, Array<string>> }
      }
      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        form.reservation_id
          ? t('forms.contract.convertErrorMessage')
          : t('forms.contract.createErrorMessage')
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
    preview,
    previewPending,
    previewError,
    reset,
    submit,
    fetchConvertPreview
  }
}
