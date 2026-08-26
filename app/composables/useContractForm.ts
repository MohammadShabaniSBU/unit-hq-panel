import { commitmentToWeeks } from '~/composables/useDiscountOptions'
import type { CreateAttributePayloadItem } from '~/composables/useRequiredCreateAttributes'
import type { ApiContract, ApiConvertPreview, ContractSignatureMode } from '~/types/contract'

export interface ContractForm {
  contact_id: number | null
  reservation_id: number | null
  deal_id: number | null
  unit_id: number | null
  unit_rate: string
  unit_tax_rate_id: number | null
  insurance_id: number | null
  insurance_rate: string
  insurance_tax_rate_id: number | null
  discount_id: number | null
  commitment_length: number | null
  commitment_period: 'week' | 'month' | null
  start_date: string
  end_date: string
  move_in_date: string
  deposit_amount: string
  signed_at: string
  signature_mode: ContractSignatureMode
}

function createDefaultForm(defaults?: Partial<ContractForm>): ContractForm {
  return {
    contact_id: null,
    reservation_id: null,
    deal_id: null,
    unit_id: null,
    unit_rate: '',
    unit_tax_rate_id: null,
    insurance_id: null,
    insurance_rate: '',
    insurance_tax_rate_id: null,
    discount_id: null,
    commitment_length: null,
    commitment_period: null,
    start_date: '',
    end_date: '',
    move_in_date: '',
    deposit_amount: '',
    signed_at: '',
    signature_mode: 'immediate',
    ...defaults
  }
}

function buildContractPayload(form: ContractForm) {
  const items: Array<Record<string, unknown>> = []

  if (form.unit_id) {
    items.push({
      item_type: 'unit',
      item_id: form.unit_id,
      amount: Number(form.unit_rate),
      tax_rate_id: form.unit_tax_rate_id
    })
  }

  if (form.insurance_id && form.insurance_rate.trim()) {
    items.push({
      item_type: 'insurance',
      item_id: form.insurance_id,
      amount: Number(form.insurance_rate),
      tax_rate_id: form.insurance_tax_rate_id
    })
  }

  const payload: Record<string, unknown> = {
    contact_id: form.contact_id,
    items,
    signature_mode: form.signature_mode
  }

  if (form.reservation_id) payload.reservation_id = form.reservation_id
  if (form.deal_id) payload.deal_id = form.deal_id
  if (form.discount_id) payload.discount_id = form.discount_id
  if (form.discount_id && form.commitment_length && form.commitment_period) {
    payload.commitment_weeks = commitmentToWeeks(form.commitment_length, form.commitment_period)
  }
  if (form.start_date.trim()) payload.start_date = form.start_date.trim()
  if (form.end_date.trim()) payload.end_date = form.end_date.trim()
  if (form.move_in_date.trim()) payload.move_in_date = form.move_in_date.trim()
  if (form.deposit_amount.trim()) payload.deposit_amount = Number(form.deposit_amount)
  if (form.signature_mode === 'immediate' && form.signed_at.trim()) {
    payload.signed_at = form.signed_at.trim()
  }

  return payload
}

function buildConvertPayload(form: ContractForm) {
  const payload: Record<string, unknown> = {
    start_date: form.start_date.trim(),
    unit_rate: Number(form.unit_rate),
    signature_mode: form.signature_mode
  }

  if (form.end_date.trim()) payload.end_date = form.end_date.trim()
  if (form.move_in_date.trim()) payload.move_in_date = form.move_in_date.trim()
  if (form.signature_mode === 'immediate' && form.signed_at.trim()) {
    payload.signed_at = form.signed_at.trim()
  }
  if (form.unit_tax_rate_id) payload.unit_tax_rate_id = form.unit_tax_rate_id
  if (form.deposit_amount.trim()) payload.deposit_amount = Number(form.deposit_amount)

  if (form.insurance_id && form.insurance_rate.trim()) {
    payload.insurance_id = form.insurance_id
    payload.insurance_rate = Number(form.insurance_rate)
    if (form.insurance_tax_rate_id) payload.insurance_tax_rate_id = form.insurance_tax_rate_id
  }

  if (form.commitment_length && form.commitment_period) {
    payload.commitment_weeks = commitmentToWeeks(form.commitment_length, form.commitment_period)
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

  async function fetchConvertPreview() {
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

      if (form.move_in_date.trim()) {
        query.move_in_date = form.move_in_date.trim()
      }

      if (form.insurance_id && form.insurance_rate.trim()) {
        query.insurance_id = form.insurance_id
        query.insurance_rate = form.insurance_rate.trim()
      }

      if (form.deposit_amount.trim()) {
        query.deposit_amount = form.deposit_amount.trim()
      }

      if (form.commitment_length && form.commitment_period) {
        query.commitment_weeks = commitmentToWeeks(form.commitment_length, form.commitment_period)
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

  async function submit(attributes?: Array<CreateAttributePayloadItem>) {
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

      const payload = buildContractPayload(form)
      if (attributes?.length) {
        payload.attributes = attributes
      }

      const response = await post<ApiContract>('/api/contracts', payload)
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
