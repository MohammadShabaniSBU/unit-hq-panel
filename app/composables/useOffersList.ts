import type { ApiOffer, OfferStatus, OfferStatusFilter } from '~/types/offer'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: OfferStatusFilter,
  siteQuery: Record<string, number>
) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage,
    ...siteQuery
  }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  return query
}

function buildSearchBody(
  page: number,
  perPage: number,
  statusFilter: OfferStatusFilter,
  searchQuery: string,
  filter: FilterGroup,
  siteQuery: Record<string, number>
) {
  const body: Record<string, unknown> = {
    page,
    per_page: perPage,
    filter,
    ...siteQuery
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

export function useOffersList(options?: { filter?: Ref<FilterGroup | null> }) {
  const { getPaginated, postPaginated } = useApi()
  const { portalSiteId, portalSiteQuery } = usePortalSiteQuery()
  const searchQuery = ref('')
  const statusFilter = ref<OfferStatusFilter>('all')
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    'offers',
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiOffer>(
          '/api/offers/search',
          buildSearchBody(
            page.value,
            perPage.value,
            statusFilter.value,
            searchQuery.value,
            filter.value,
            portalSiteQuery.value
          )
        )
      }

      return getPaginated<ApiOffer>(
        '/api/offers',
        buildListQuery(page.value, perPage.value, statusFilter.value, portalSiteQuery.value)
      )
    },
    { watch: [page, perPage, statusFilter, filter, searchQuery, portalSiteId] }
  )

  const paginatedOffers = computed(() => {
    const items = data.value?.data ?? []
    if (hasAdvancedFilter.value) {
      return items
    }

    return items.filter(offer => matchesSearch(offer, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedOffers.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter, filter, portalSiteId], () => {
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
