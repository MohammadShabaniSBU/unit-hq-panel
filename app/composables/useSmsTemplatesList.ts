import type { ApiTemplateFamily } from '~/types/email-builder'

export function useSmsTemplatesList() {
  const { getPaginated } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()
  const searchQuery = ref('')

  const { data, pending, error, refresh } = useAsyncData(
    () => `template-families-sms-${page.value}-${perPage.value}-${searchQuery.value}`,
    () => getPaginated<ApiTemplateFamily>('/api/template-families', {
      page: page.value,
      per_page: perPage.value,
      channel: 'sms',
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [page, perPage, searchQuery] }
  )

  watch(searchQuery, () => {
    resetPage()
  })

  const families = computed(() => data.value?.data ?? [])
  const templates = computed(() => families.value.map(f => ({ id: f.id, name: f.name })))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => families.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  return {
    families,
    templates,
    totalCount,
    showingCount,
    lastPage,
    page,
    perPage,
    canGoPrev,
    canGoNext,
    searchQuery,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}
