import type { ApiUnit } from '~/types/facility'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

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

function buildSearchBody(page: number, perPage: number, filter: FilterGroup) {
  return {
    page,
    per_page: perPage,
    filter
  }
}

export function useUnitsList(options?: { filter?: Ref<FilterGroup | null> }) {
  const { getPaginated, postPaginated } = useApi()
  const searchQuery = ref('')
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    'units',
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiUnit>(
          '/api/units/search',
          buildSearchBody(page.value, perPage.value, filter.value)
        )
      }

      return getPaginated<ApiUnit>('/api/units', { page: page.value, per_page: perPage.value })
    },
    { watch: [page, perPage, filter] }
  )

  const paginatedUnits = computed(() => {
    const items = data.value?.data ?? []
    if (hasAdvancedFilter.value) {
      return items
    }

    return items.filter(unit => matchesSearch(unit, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedUnits.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, filter], () => {
    resetPage()
  })

  return {
    searchQuery,
    paginatedUnits,
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
