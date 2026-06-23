import type { ApiDeal } from '~/types/deal'

export function useDealUpdate(id: MaybeRefOrGetter<string | number>) {
  const { patch } = useApi()
  const { t } = useI18n()
  const updatingField = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  async function updateField(field: string, value: string | null) {
    updatingField.value = field
    const { [field]: _, ...rest } = fieldErrors.value
    fieldErrors.value = rest

    const payload: Record<string, unknown> = {
      [field]: value === '' || value === null ? null : value
    }

    try {
      const response = await patch<ApiDeal>(`/api/deals/${toValue(id)}`, payload)
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      const fieldError = fetchError.data?.errors?.[field]?.[0]
      fieldErrors.value = {
        ...fieldErrors.value,
        [field]: fieldError ?? fetchError.data?.message ?? t('forms.deal.updateErrorMessage')
      }
      return null
    } finally {
      updatingField.value = null
    }
  }

  return {
    updateField,
    updatingField,
    fieldErrors
  }
}
