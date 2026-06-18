import type { ApiDeal, DealStatusFilter } from '~/types/deal'

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
    deal.intent_notes ?? '',
    String(deal.contact_id)
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useDealsList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<DealStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'deals',
    () => getPaginated<ApiDeal>('/api/deals', buildListQuery(page.value, perPage.value, statusFilter.value)),
    { watch: [page, perPage, statusFilter] }
  )

  const paginatedDeals = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(deal => matchesSearch(deal, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedDeals.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter], () => {
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

export function formatDealExpectedValue(deal: ApiDeal, emptyValue = '—') {
  if (!deal.expected_value || Number(deal.expected_value) === 0) {
    return emptyValue
  }

  return Number(deal.expected_value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
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
