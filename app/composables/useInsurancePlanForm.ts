import type { ApiInsurancePlan } from '~/types/facility'

export interface InsurancePlanForm {
  name: string
  description: string
  coverage: number | undefined
  currency: string
  tax_rate_code: string | null
}

function createDefaultForm(): InsurancePlanForm {
  return {
    name: '',
    description: '',
    coverage: undefined,
    currency: 'EUR',
    tax_rate_code: null
  }
}

export function formFromInsurancePlan(plan: ApiInsurancePlan): InsurancePlanForm {
  const parsedCoverage = Number(plan.coverage)

  return {
    name: plan.name,
    description: plan.description ?? '',
    coverage: Number.isNaN(parsedCoverage) ? undefined : parsedCoverage,
    currency: plan.currency,
    tax_rate_code: plan.tax_rate_code
  }
}

function buildPayload(form: InsurancePlanForm) {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    coverage: form.coverage,
    currency: form.currency.trim().toUpperCase(),
    tax_rate_code: form.tax_rate_code
  }

  if (form.description.trim()) {
    payload.description = form.description.trim()
  }

  return payload
}

export function useInsurancePlanForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<InsurancePlanForm>(createDefaultForm())
  const editingPlanId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingPlanId.value != null)

  function reset() {
    Object.assign(form, createDefaultForm())
    editingPlanId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(plan: ApiInsurancePlan | null) {
    reset()

    if (!plan) {
      return
    }

    editingPlanId.value = plan.id
    Object.assign(form, formFromInsurancePlan(plan))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingPlanId.value
        ? await patch<ApiInsurancePlan>(`/api/insurances/${editingPlanId.value}`, payload)
        : await post<ApiInsurancePlan>('/api/insurances', payload)

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
          ? t('forms.insurancePlan.editErrorMessage')
          : t('forms.insurancePlan.createErrorMessage')
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
