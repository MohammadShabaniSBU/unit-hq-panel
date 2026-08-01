import type { ApiOverdueContract } from '~/types/billing'

interface OverdueResponse {
  message: string
  data: Array<ApiOverdueContract>
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    failed_autopay_count: number
  }
}

export function useBillingOverdue() {
  const { apiFetch } = useApi()

  const failedOnly = ref(false)
  const page = ref(1)

  const { data, pending, error, refresh } = useAsyncData(
    'billing-overdue',
    () => {
      const query: Record<string, string | number> = { page: page.value }
      if (failedOnly.value) {
        query.failed_autopay = 1
      }
      return apiFetch<OverdueResponse>('/api/billing/overdue', { query })
    },
    { watch: [failedOnly, page] }
  )

  const contracts = computed(() => data.value?.data ?? [])
  const meta = computed(() => data.value?.meta ?? null)
  const failedAutopayCount = computed(() => meta.value?.failed_autopay_count ?? 0)

  return {
    contracts,
    meta,
    failedAutopayCount,
    failedOnly,
    page,
    pending,
    error,
    refresh
  }
}
