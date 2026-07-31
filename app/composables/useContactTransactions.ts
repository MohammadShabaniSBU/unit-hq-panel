import type { ApiBillingPeriod } from '~/types/billing-period'
import type { ApiPayment } from '~/types/payment'

export interface ApiContactTransactions {
  billing_periods: Array<ApiBillingPeriod>
  payments: Array<ApiPayment>
}

export function billingPeriodStatusColor(status: string) {
  if (status === 'paid') return 'success'
  if (status === 'issued') return 'info'
  if (status === 'void') return 'error'
  return 'neutral'
}

export function useContactTransactions(contactId: MaybeRefOrGetter<string | number>) {
  const { get } = useApi()
  const id = computed(() => String(toValue(contactId)))

  const { data, pending, error, refresh, execute, status } = useAsyncData(
    () => `contact:${id.value}:transactions`,
    () => get<ApiContactTransactions>(`/api/contacts/${id.value}/transactions`),
    { immediate: false }
  )

  const billingPeriods = computed(() => data.value?.data?.billing_periods ?? [])
  const payments = computed(() => data.value?.data?.payments ?? [])
  const loaded = computed(() => status.value === 'success' || status.value === 'error')

  async function ensureLoaded() {
    if (status.value === 'idle' || status.value === 'error') {
      await execute()
    }
  }

  return {
    billingPeriods,
    payments,
    pending,
    error,
    refresh,
    execute,
    loaded,
    ensureLoaded
  }
}
