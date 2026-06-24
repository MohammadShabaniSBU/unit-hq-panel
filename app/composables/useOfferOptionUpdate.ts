import type { ApiOfferOption } from '~/types/offer'

export interface OfferOptionCreatePayload {
  offer_id: number
  unit_class_rate_id: number
  discount_id?: number | null
  label: string
  description?: string | null
  display_order: number
}

export interface OfferOptionUpdatePayload {
  unit_class_rate_id?: number
  discount_id?: number | null
  label?: string
  description?: string | null
  display_order?: number
}

export function useOfferOptionUpdate() {
  const { patch, post, del } = useApi()
  const { t } = useI18n()
  const loading = ref(false)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function parseError(err: unknown, fallback: string) {
    const fetchError = err as {
      data?: {
        message?: string
        errors?: Record<string, Array<string>>
      }
    }

    fieldErrors.value = fetchError.data?.errors ?? {}
    return fetchError.data?.message ?? fallback
  }

  async function createOption(payload: OfferOptionCreatePayload) {
    loading.value = true
    fieldErrors.value = {}

    try {
      const response = await post<ApiOfferOption>('/api/offer-options', payload as unknown as Record<string, unknown>)
      return { data: response.data, error: null as string | null }
    } catch (err: unknown) {
      return {
        data: null,
        error: parseError(err, t('forms.offer.createErrorMessage'))
      }
    } finally {
      loading.value = false
    }
  }

  async function updateOption(id: number, payload: OfferOptionUpdatePayload) {
    loading.value = true
    fieldErrors.value = {}

    try {
      const response = await patch<ApiOfferOption>(`/api/offer-options/${id}`, payload as unknown as Record<string, unknown>)
      return { data: response.data, error: null as string | null }
    } catch (err: unknown) {
      return {
        data: null,
        error: parseError(err, t('forms.offer.createErrorMessage'))
      }
    } finally {
      loading.value = false
    }
  }

  async function deleteOption(id: number) {
    loading.value = true
    fieldErrors.value = {}

    try {
      await del(`/api/offer-options/${id}`)
      return { data: true, error: null as string | null }
    } catch (err: unknown) {
      return {
        data: false,
        error: parseError(err, t('forms.offer.createErrorMessage'))
      }
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    fieldErrors,
    createOption,
    updateOption,
    deleteOption
  }
}
