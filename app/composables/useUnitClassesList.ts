import type { ApiUnitClass } from '~/types/facility'

function matchesSearch(unitClass: ApiUnitClass, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    unitClass.code,
    unitClass.label
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useUnitClassesList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'unit-classes',
    () => getPaginated<ApiUnitClass>('/api/unit-classes', { page: page.value, per_page: perPage.value }),
    { watch: [page, perPage] }
  )

  const paginatedUnitClasses = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(unitClass => matchesSearch(unitClass, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedUnitClasses.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch(searchQuery, () => {
    resetPage()
  })

  return {
    searchQuery,
    paginatedUnitClasses,
    totalCount,
    showingCount,
    page,
    perPage,
    perPageOptions,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}

export function formatUnitClassSize(size: string | null) {
  if (!size) {
    return '—'
  }

  return `${size} m²`
}
