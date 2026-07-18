import type { ApiDiscount, DiscountType } from '~/types/facility'

export interface DiscountForm {
  code: string
  label: string
  discount_type: DiscountType
  value: number | undefined
  duration_months: number | undefined
  durationForever: boolean
  effective_from: string
  effective_to: string
}

function createDefaultForm(): DiscountForm {
  return {
    code: '',
    label: '',
    discount_type: 'percentage',
    value: undefined,
    duration_months: undefined,
    durationForever: true,
    effective_from: '',
    effective_to: ''
  }
}

export function formFromDiscount(discount: ApiDiscount): DiscountForm {
  const parsedValue = Number(discount.value)
  const parsedDuration = discount.duration_months == null ? undefined : discount.duration_months

  return {
    code: discount.code ?? '',
    label: discount.label,
    discount_type: discount.discount_type,
    value: Number.isNaN(parsedValue) ? undefined : parsedValue,
    duration_months: parsedDuration,
    durationForever: discount.duration_months == null,
    effective_from: discount.effective_from ?? '',
    effective_to: discount.effective_to ?? ''
  }
}

function buildPayload(form: DiscountForm) {
  const payload: Record<string, unknown> = {
    label: form.label.trim(),
    discount_type: form.discount_type,
    value: form.value
  }

  if (form.code.trim()) {
    payload.code = form.code.trim()
  } else {
    payload.code = null
  }

  payload.duration_months = form.durationForever ? null : form.duration_months ?? null

  if (form.effective_from.trim()) {
    payload.effective_from = form.effective_from.trim()
  } else {
    payload.effective_from = null
  }

  if (form.effective_to.trim()) {
    payload.effective_to = form.effective_to.trim()
  } else {
    payload.effective_to = null
  }

  return payload
}

export function useDiscountForm() {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<DiscountForm>(createDefaultForm())
  const editingDiscountId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const isEditing = computed(() => editingDiscountId.value != null)

  const discountTypeOptions = computed(() => [
    { label: t('forms.discount.typePercentage'), value: 'percentage' },
    { label: t('forms.discount.typeFixedAmount'), value: 'fixed_amount' }
  ])

  function reset() {
    Object.assign(form, createDefaultForm())
    editingDiscountId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(discount: ApiDiscount | null) {
    reset()

    if (!discount) {
      return
    }

    editingDiscountId.value = discount.id
    Object.assign(form, formFromDiscount(discount))
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const response = editingDiscountId.value
        ? await patch<ApiDiscount>(`/api/discounts/${editingDiscountId.value}`, payload)
        : await post<ApiDiscount>('/api/discounts', payload)

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
          ? t('forms.discount.editErrorMessage')
          : t('forms.discount.createErrorMessage')
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
    discountTypeOptions,
    load,
    reset,
    submit
  }
}
