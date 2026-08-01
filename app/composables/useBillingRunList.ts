import type { ApiBillingRun, ApiBillingRunPreviewRow } from '~/types/billing'

export function useBillingRunList() {
  const { getPaginated, post } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    () => `billing-runs-${page.value}-${perPage.value}`,
    () => getPaginated<ApiBillingRun>('/api/billing-runs', {
      page: page.value,
      per_page: perPage.value
    }),
    { watch: [page, perPage] }
  )

  const runs = computed(() => data.value?.data ?? [])
  const total = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => runs.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  const previewing = ref(false)
  const running = ref(false)

  async function previewRun(): Promise<Array<ApiBillingRunPreviewRow>> {
    previewing.value = true
    try {
      const response = await post<Array<ApiBillingRunPreviewRow>>('/api/billing-runs', {
        dry_run: true
      })
      return response.data ?? []
    } finally {
      previewing.value = false
    }
  }

  async function executeRun(): Promise<ApiBillingRun> {
    running.value = true
    try {
      const response = await post<ApiBillingRun>('/api/billing-runs', {
        dry_run: false
      })
      await refresh()
      return response.data
    } finally {
      running.value = false
    }
  }

  return {
    runs,
    total,
    showingCount,
    page,
    perPage,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    previewing,
    running,
    previewRun,
    executeRun,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value),
    resetPage
  }
}
