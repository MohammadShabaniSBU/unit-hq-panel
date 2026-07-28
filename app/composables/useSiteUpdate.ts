import type { ApiSite } from '~/types/facility'

export function useSiteUpdate(id: MaybeRefOrGetter<string | number>) {
  const { patch } = useApi()
  const { t } = useI18n()
  const updatingField = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string>>({})

  async function updatePayload(
    trackingField: string,
    payload: Record<string, unknown>
  ) {
    updatingField.value = trackingField
    const { [trackingField]: _, ...rest } = fieldErrors.value
    fieldErrors.value = rest

    try {
      const response = await patch<ApiSite>(`/api/sites/${toValue(id)}`, payload)
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      const fieldError = fetchError.data?.errors?.[trackingField]?.[0]
        ?? Object.values(fetchError.data?.errors ?? {})[0]?.[0]

      fieldErrors.value = {
        ...fieldErrors.value,
        [trackingField]: fieldError
          ?? fetchError.data?.message
          ?? t('forms.site.updateErrorMessage')
      }
      return null
    } finally {
      updatingField.value = null
    }
  }

  async function updateField(field: string, value: string | number | null) {
    const payloadValue = value === '' || value === null ? null : value
    return updatePayload(field, { [field]: payloadValue })
  }

  return {
    updateField,
    updatePayload,
    updatingField,
    fieldErrors
  }
}
