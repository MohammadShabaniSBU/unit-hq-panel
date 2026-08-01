import type {
  ApiDelinquencyBoardMeta,
  ApiDelinquencyCase,
  DaysBucket,
  DelinquencyBoardStatus
} from '~/types/delinquency'

interface DelinquencyListResponse {
  message: string
  data: Array<ApiDelinquencyCase>
  meta: ApiDelinquencyBoardMeta
}

export function useDelinquencyList() {
  const { apiFetch } = useApi()

  const status = ref<DelinquencyBoardStatus>('open')
  const siteId = ref<number | null>(null)
  const daysBucket = ref<DaysBucket | null>(null)
  const paused = ref<boolean | null>(null)
  const overlocked = ref<boolean | null>(null)
  const page = ref(1)

  const { data, pending, error, refresh } = useAsyncData(
    'billing-delinquencies',
    () => {
      const query: Record<string, string | number> = {
        page: page.value,
        per_page: 25,
        status: status.value
      }
      if (siteId.value != null) query.site_id = siteId.value
      if (daysBucket.value) query.days_bucket = daysBucket.value
      if (paused.value != null) query.paused = paused.value ? 1 : 0
      if (overlocked.value != null) query.overlocked = overlocked.value ? 1 : 0

      return apiFetch<DelinquencyListResponse>('/api/delinquencies', { query })
    },
    { watch: [status, siteId, daysBucket, paused, overlocked, page] }
  )

  const cases = computed(() => data.value?.data ?? [])
  const meta = computed(() => data.value?.meta ?? null)

  function setStatus(next: DelinquencyBoardStatus) {
    status.value = next
    page.value = 1
  }

  function setDaysBucket(next: DaysBucket | null) {
    daysBucket.value = next
    page.value = 1
  }

  return {
    cases,
    meta,
    status,
    siteId,
    daysBucket,
    paused,
    overlocked,
    page,
    pending,
    error,
    refresh,
    setStatus,
    setDaysBucket
  }
}
