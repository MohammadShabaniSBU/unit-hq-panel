import type { ApiPayment, RecordPaymentPayload } from '~/types/payment'

export function useManualPayment(contractId: MaybeRefOrGetter<string | number>) {
  const { post } = useApi()
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function record(payload: RecordPaymentPayload): Promise<ApiPayment> {
    pending.value = true
    error.value = null
    try {
      const res = await post<ApiPayment>(
        `/api/contracts/${toValue(contractId)}/payments`,
        payload as unknown as Record<string, unknown>
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      pending.value = false
    }
  }

  async function reverse(paymentId: number, reason: string): Promise<ApiPayment> {
    pending.value = true
    error.value = null
    try {
      const res = await post<ApiPayment>(
        `/api/payments/${paymentId}/reverse`,
        { reason }
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      pending.value = false
    }
  }

  function extractError(e: unknown): string {
    if (e && typeof e === 'object' && 'data' in e) {
      const data = (e as { data?: { message?: string, errors?: Record<string, Array<string>> } }).data
      if (data?.errors) {
        const first = Object.values(data.errors)[0]
        if (first?.[0]) return first[0]
      }
      if (data?.message) return data.message
    }
    return 'Request failed'
  }

  return {
    pending,
    error,
    record,
    reverse
  }
}
