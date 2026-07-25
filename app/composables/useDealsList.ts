import type { ApiDeal, DealStatusFilter } from '~/types/deal'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

function buildListQuery(page: number, perPage: number, statusFilter: DealStatusFilter) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage
  }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  return query
}

function buildSearchBody(
  page: number,
  perPage: number,
  statusFilter: DealStatusFilter,
  searchQuery: string,
  filter: FilterGroup
) {
  const body: Record<string, unknown> = {
    page,
    per_page: perPage,
    filter
  }

  if (statusFilter !== 'all') {
    body.status = statusFilter
  }

  const search = searchQuery.trim()
  if (search) {
    body.search = search
  }

  return body
}

function matchesSearch(deal: ApiDeal, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    deal.contact?.name ?? '',
    deal.desired_unit_class?.label ?? '',
    deal.desired_unit_class?.code ?? '',
    deal.storage_reason ?? '',
    String(deal.contact_id)
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useDealsList(options?: { filter?: Ref<FilterGroup | null> }) {
  const { getPaginated, postPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<DealStatusFilter>('all')
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    'deals',
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiDeal>(
          '/api/deals/search',
          buildSearchBody(page.value, perPage.value, statusFilter.value, searchQuery.value, filter.value)
        )
      }

      return getPaginated<ApiDeal>('/api/deals', buildListQuery(page.value, perPage.value, statusFilter.value))
    },
    { watch: [page, perPage, statusFilter, filter, searchQuery] }
  )

  const paginatedDeals = computed(() => {
    const items = data.value?.data ?? []
    if (hasAdvancedFilter.value) {
      return items
    }

    return items.filter(deal => matchesSearch(deal, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedDeals.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter, filter], () => {
    resetPage()
  })

  return {
    searchQuery,
    statusFilter,
    paginatedDeals,
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

export function formatDealStay(deal: ApiDeal, emptyValue = '—') {
  if (!deal.expected_stay_length || !deal.expected_stay_period) {
    return emptyValue
  }

  return `${deal.expected_stay_length} ${deal.expected_stay_period}`
}

export function dealStatusColor(status: ApiDeal['status']) {
  if (status === 'closed_won') {
    return 'success'
  }

  if (status === 'closed_lost') {
    return 'error'
  }

  if (status === 'negotiating') {
    return 'warning'
  }

  return 'neutral'
}
