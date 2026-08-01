import type {
  ApiPaymentIntent,
  ApiPaymentRequest,
  ApiPublicPaymentRequest,
  CreatePaymentRequestPayload
} from '~/types/paymentRequest'

export function usePaymentRequests(contractId: Ref<number | string | null>) {
  const { get, post } = useApi()
  const { t } = useI18n()

  const enabled = computed(() => contractId.value != null && Number(contractId.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    () => `contract-payment-requests-${contractId.value}`,
    () => get<Array<ApiPaymentRequest>>(`/api/contracts/${contractId.value}/payment-requests`),
    { watch: [contractId], immediate: false }
  )

  const requests = computed(() => data.value?.data ?? [])

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function load() {
    if (!enabled.value) return
    await refresh()
  }

  async function create(payload: CreatePaymentRequestPayload = {}) {
    if (!enabled.value) return null
    submitting.value = true
    actionError.value = null

    try {
      const response = await post<ApiPaymentRequest>(
        `/api/contracts/${contractId.value}/payment-requests`,
        payload as Record<string, unknown>
      )
      await refresh()
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('billing.paymentRequests.createError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function cancel(paymentRequestId: number) {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiPaymentRequest>(`/api/payment-requests/${paymentRequestId}/cancel`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('billing.paymentRequests.cancelError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    requests,
    pending,
    error,
    refresh: load,
    submitting,
    actionError,
    create,
    cancel
  }
}

export function usePublicPayment() {
  const { get, post } = useApi()

  const payment = ref<ApiPublicPaymentRequest | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)
  const intentPending = ref(false)

  async function fetchByToken(token: string) {
    pending.value = true
    error.value = null

    try {
      const res = await get<ApiPublicPaymentRequest>(`/api/pay/${token}`)
      payment.value = res.data
    } catch (e) {
      error.value = e
      payment.value = null
    } finally {
      pending.value = false
    }
  }

  async function createIntent(token: string) {
    intentPending.value = true

    try {
      const res = await post<ApiPaymentIntent>(`/api/pay/${token}/intent`, {})
      return res.data
    } finally {
      intentPending.value = false
    }
  }

  return {
    payment,
    pending,
    error,
    intentPending,
    fetchByToken,
    createIntent
  }
}
