import type { ApiUnit } from '~/types/facility'

function matchesSearch(unit: ApiUnit, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    unit.unit_number,
    unit.note ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useUnitsList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'units',
    () => getPaginated<ApiUnit>('/api/units', { page: page.value, per_page: perPage.value }),
    { watch: [page, perPage] }
  )

  const paginatedUnits = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(unit => matchesSearch(unit, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedUnits.value.length)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < (data.value?.meta.last_page ?? 1))

  watch(searchQuery, () => {
    resetPage()
  })

  return {
    searchQuery,
    paginatedUnits,
    totalCount,
    showingCount,
    perPage,
    perPageOptions,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(data.value?.meta.last_page ?? 1)
  }
}

export function formatUnitDimensions(unit: ApiUnit) {
  const width = unit.actual_width
  const depth = unit.actual_depth
  const height = unit.actual_height

  if (!width && !depth && !height) {
    return '—'
  }

  const parts = [width, depth, height].filter(Boolean)
  return `${parts.join(' × ')} m`
}

export function formatUnitSite(unit: ApiUnit) {
  return unit.site?.name ?? '—'
}

export function formatUnitClass(unit: ApiUnit) {
  if (!unit.unit_class) {
    return '—'
  }

  return `${unit.unit_class.code} — ${unit.unit_class.label}`
}
