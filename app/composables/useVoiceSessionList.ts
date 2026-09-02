import type { VoiceSession } from '~/types/voiceSession'

export function useVoiceSessionList() {
  const { getPaginated } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const dateFrom = ref<string>('')
  const dateTo = ref<string>('')
  const siteId = ref<number | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `voice-sessions-${dateFrom.value}-${dateTo.value}-${siteId.value ?? 'all'}-${page.value}-${perPage.value}`,
    () => {
      const query: Record<string, string | number> = {
        page: page.value,
        per_page: perPage.value
      }
      if (dateFrom.value) {
        query.date_from = dateFrom.value
      }
      if (dateTo.value) {
        query.date_to = dateTo.value
      }
      if (siteId.value) {
        query.site_id = siteId.value
      }

      return getPaginated<VoiceSession>('/api/voice-sessions', query)
    },
    { watch: [page, perPage, dateFrom, dateTo, siteId] }
  )

  const sessions = computed(() => data.value?.data ?? [])
  const total = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => sessions.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([dateFrom, dateTo, siteId], () => {
    resetPage()
  })

  return {
    sessions,
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
    dateFrom,
    dateTo,
    siteId,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}
