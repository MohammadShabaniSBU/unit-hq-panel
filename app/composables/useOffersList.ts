import type { ApiOffer, OfferStatus, OfferStatusFilter } from '~/types/offer'

function buildListQuery(page: number, perPage: number, statusFilter: OfferStatusFilter) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage
  }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  return query
}

function matchesSearch(offer: ApiOffer, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    offer.contact?.name ?? '',
    String(offer.deal_id),
    offer.token,
    offer.status
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useOffersList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<OfferStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'offers',
    () => getPaginated<ApiOffer>('/api/offers', buildListQuery(page.value, perPage.value, statusFilter.value)),
    { watch: [page, perPage, statusFilter] }
  )

  const paginatedOffers = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(offer => matchesSearch(offer, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedOffers.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter], () => {
    resetPage()
  })

  return {
    searchQuery,
    statusFilter,
    paginatedOffers,
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

export function offerStatusColor(status: OfferStatus) {
  if (status === 'accepted') {
    return 'success'
  }

  if (status === 'expired') {
    return 'error'
  }

  if (status === 'viewed') {
    return 'warning'
  }

  if (status === 'sent') {
    return 'info'
  }

  return 'neutral'
}
