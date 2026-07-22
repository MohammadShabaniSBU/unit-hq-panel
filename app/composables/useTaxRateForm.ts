import type { ApiTaxRate } from '~/types/tax-rate'

export interface TaxRateForm {
  name: string
  code: string
  rate: string
  jurisdiction: string
  is_default: boolean
  effective_from: string
}

function createDefaultForm(): TaxRateForm {
  return {
    name: '',
    code: '',
    rate: '',
    jurisdiction: '',
    is_default: false,
    effective_from: ''
  }
}

export function formFromTaxRate(taxRate: ApiTaxRate): TaxRateForm {
  return {
    name: taxRate.name,
    code: taxRate.code,
    rate: taxRate.rate,
    jurisdiction: taxRate.jurisdiction ?? '',
    is_default: taxRate.is_default,
    effective_from: ''
  }
}

function buildCreatePayload(form: TaxRateForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    code: form.code.trim(),
    rate: Number(form.rate),
    is_default: form.is_default
  }

  if (form.jurisdiction.trim()) payload.jurisdiction = form.jurisdiction.trim()
  if (form.effective_from.trim()) payload.effective_from = form.effective_from.trim()

  return payload
}

function buildVersionPayload(form: TaxRateForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    rate: Number(form.rate)
  }

  payload.jurisdiction = form.jurisdiction.trim() || null
  if (form.effective_from.trim()) payload.effective_from = form.effective_from.trim()

  return payload
}

export function useTaxRateForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<TaxRateForm>(createDefaultForm())
  const editingTaxRateId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingTaxRateId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingTaxRateId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(taxRate: ApiTaxRate | null) {
    reset()

    if (!taxRate) {
      return
    }

    editingTaxRateId.value = taxRate.id
    Object.assign(form, formFromTaxRate(taxRate))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = editingTaxRateId.value
        ? await patch<ApiTaxRate>(`/api/tax-rates/${editingTaxRateId.value}`, buildVersionPayload(form))
        : await post<ApiTaxRate>('/api/tax-rates', buildCreatePayload(form))

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
          ? t('forms.taxRate.editErrorMessage')
          : t('forms.taxRate.createErrorMessage')
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
