import type { ApiContractAutopay } from '~/types/contract'

export function useContractAutopay(contractId: Ref<number | string>) {
  const { get, put, post } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    () => `contract-autopay-${contractId.value}`,
    () => get<ApiContractAutopay>(`/api/contracts/${contractId.value}/autopay`),
    { watch: [contractId] }
  )

  const autopay = computed(() => data.value?.data ?? null)
  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function update(payload: { enabled: boolean, payment_method_id?: number | null }) {
    submitting.value = true
    actionError.value = null

    try {
      await put<ApiContractAutopay>(`/api/contracts/${contractId.value}/autopay`, payload)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('billing.autopay.saveError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function retry() {
    submitting.value = true
    actionError.value = null

    try {
      await post(`/api/contracts/${contractId.value}/autopay/retry`)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('billing.autopay.retryError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    autopay,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    update,
    retry
  }
}
