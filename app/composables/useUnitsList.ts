import type { ApiUnit } from '~/types/facility'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'
import type { UnitStateFilter, UnitStateTabCounts } from '~/types/unit'
import { UNIT_STATE_FILTERS } from '~/types/unit'

const EMPTY_TAB_COUNTS: UnitStateTabCounts = {
  all: 0,
  available: 0,
  occupied: 0,
  reserved: 0,
  out_of_service: 0
}

function matchesSearch(unit: ApiUnit, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    unit.unit_number,
    unit.note ?? '',
    unit.tenant_name ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

function appendStateParams(
  query: Record<string, string | number>,
  stateFilter: UnitStateFilter
) {
  if (stateFilter === 'all') {
    return
  }

  if (stateFilter === 'out_of_service') {
    query.state_group = 'out_of_service'
    return
  }

  query.state = stateFilter
}

function buildListQuery(
  page: number,
  perPage: number,
  stateFilter: UnitStateFilter
) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage
  }

  appendStateParams(query, stateFilter)

  return query
}

function buildCountQuery(stateFilter: UnitStateFilter = 'all') {
  const query: Record<string, string | number> = {
    page: 1,
    per_page: 1
  }

  appendStateParams(query, stateFilter)

  return query
}

function buildSearchBody(
  page: number,
  perPage: number,
  stateFilter: UnitStateFilter,
  filter: FilterGroup
) {
  const body: Record<string, unknown> = {
    page,
    per_page: perPage,
    filter
  }

  if (stateFilter === 'out_of_service') {
    body.state_group = 'out_of_service'
  } else if (stateFilter !== 'all') {
    body.state = stateFilter
  }

  return body
}

export function useUnitsList(options?: { filter?: Ref<FilterGroup | null> }) {
  const { getPaginated, postPaginated } = useApi()
  const searchQuery = ref('')
  const stateFilter = ref<UnitStateFilter>('all')
  const tabCounts = ref<UnitStateTabCounts>({ ...EMPTY_TAB_COUNTS })
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    'units',
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiUnit>(
          '/api/units/search',
          buildSearchBody(page.value, perPage.value, stateFilter.value, filter.value)
        )
      }

      return getPaginated<ApiUnit>(
        '/api/units',
        buildListQuery(page.value, perPage.value, stateFilter.value)
      )
    },
    { watch: [page, perPage, stateFilter, filter] }
  )

  async function refreshTabCounts() {
    const countFilters = UNIT_STATE_FILTERS.filter(key => key !== 'all')
    const [allResponse, ...stateResponses] = await Promise.all([
      getPaginated<ApiUnit>('/api/units', buildCountQuery('all')),
      ...countFilters.map(key => getPaginated<ApiUnit>('/api/units', buildCountQuery(key)))
    ])

    tabCounts.value = {
      all: allResponse.meta.total,
      available: stateResponses[0]?.meta.total ?? 0,
      occupied: stateResponses[1]?.meta.total ?? 0,
      reserved: stateResponses[2]?.meta.total ?? 0,
      out_of_service: stateResponses[3]?.meta.total ?? 0
    }
  }

  async function refreshAll() {
    await refresh()
    await refreshTabCounts()
  }

  onMounted(() => {
    refreshTabCounts()
  })

  const paginatedUnits = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(unit => matchesSearch(unit, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedUnits.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, stateFilter, filter], () => {
    resetPage()
  })

  function setStateFilter(filterValue: UnitStateFilter) {
    stateFilter.value = filterValue
  }

  return {
    searchQuery,
    stateFilter,
    tabCounts,
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
    refresh: refreshAll,
    setStateFilter,
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
