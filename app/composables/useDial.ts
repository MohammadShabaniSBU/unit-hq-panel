import type { ApiDialRequest, ApiDialResult } from '~/types/communications'

export function useDial() {
  const { post } = useApi()
  const { t } = useI18n()
  const toast = useToast()

  const submitting = ref(false)
  const error = ref<string | null>(null)

  function extractErrorMessage(err: unknown): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors
      ? Object.values(fetchError.data.errors)[0]?.[0]
      : undefined
    return firstFieldError ?? fetchError.data?.message ?? t('calls.dialError')
  }

  async function dial(payload: ApiDialRequest): Promise<ApiDialResult | null> {
    submitting.value = true
    error.value = null
    try {
      const body: Record<string, unknown> = {
        contact_id: payload.contact_id
      }
      if (payload.to_number) {
        body.to_number = payload.to_number
      }
      if (payload.context) {
        body.context = {
          type: payload.context.type,
          ...(payload.context.id != null ? { id: payload.context.id } : {})
        }
      }

      const res = await post<ApiDialResult>('/api/calls/dial', body)
      toast.add({
        title: t('calls.dialSuccess'),
        color: 'success'
      })
      return res.data
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
      toast.add({
        title: error.value,
        color: 'error'
      })
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    submitting,
    error,
    dial
  }
}
