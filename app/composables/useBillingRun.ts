import type { ApiBillingRun, BillingRunItemOutcome } from '~/types/billing'

export function useBillingRun(id: MaybeRefOrGetter<string | number>) {
  const { get } = useApi()
  const runId = computed(() => String(toValue(id)))
  const outcomeFilter = ref<BillingRunItemOutcome | 'all'>('all')

  const { data, pending, error, refresh } = useAsyncData(
    () => `billing-run-${runId.value}-${outcomeFilter.value}`,
    () => {
      const query: Record<string, string | number> = {}
      if (outcomeFilter.value !== 'all') {
        query.outcome = outcomeFilter.value
      }
      return get<ApiBillingRun>(`/api/billing-runs/${runId.value}`, query)
    },
    { watch: [runId, outcomeFilter] }
  )

  const run = computed(() => data.value?.data ?? null)
  const items = computed(() => run.value?.items ?? [])

  return {
    run,
    items,
    outcomeFilter,
    pending,
    error,
    refresh
  }
}
