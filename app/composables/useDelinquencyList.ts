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
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const status = ref<DelinquencyBoardStatus>('open')
  const siteId = ref<number | null>(null)
  const daysBucket = ref<DaysBucket | null>(null)
  const paused = ref<boolean | null>(null)
  const overlocked = ref<boolean | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `billing-delinquencies-${status.value}-${siteId.value ?? 'all'}-${daysBucket.value ?? 'all'}-${paused.value ?? 'all'}-${overlocked.value ?? 'all'}-${page.value}-${perPage.value}`,
    () => {
      const query: Record<string, string | number> = {
        page: page.value,
        per_page: perPage.value,
        status: status.value
      }
      if (siteId.value != null) query.site_id = siteId.value
      if (daysBucket.value) query.days_bucket = daysBucket.value
      if (paused.value != null) query.paused = paused.value ? 1 : 0
      if (overlocked.value != null) query.overlocked = overlocked.value ? 1 : 0

      return apiFetch<DelinquencyListResponse>('/api/delinquencies', { query })
    },
    { watch: [status, siteId, daysBucket, paused, overlocked, page, perPage] }
  )

  const cases = computed(() => data.value?.data ?? [])
  const meta = computed(() => data.value?.meta ?? null)
  const total = computed(() => meta.value?.total ?? 0)
  const showingCount = computed(() => cases.value.length)
  const lastPage = computed(() => meta.value?.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([status, siteId, daysBucket, paused, overlocked], () => {
    resetPage()
  })

  function setStatus(next: DelinquencyBoardStatus) {
    status.value = next
  }

  function setDaysBucket(next: DaysBucket | null) {
    daysBucket.value = next
  }

  return {
    cases,
    meta,
    total,
    showingCount,
    status,
    siteId,
    daysBucket,
    paused,
    overlocked,
    page,
    perPage,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    setStatus,
    setDaysBucket,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}
