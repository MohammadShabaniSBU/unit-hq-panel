import type { ApiReservation, ReservationStatusFilter } from '~/types/reservation'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: ReservationStatusFilter,
  siteQuery: Record<string, number>,
  contactId?: number,
  dealId?: number
) {
  const query: Record<string, string | number> = { page, per_page: perPage, ...siteQuery }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  if (contactId) {
    query.contact_id = contactId
  }

  if (dealId) {
    query.deal_id = dealId
  }

  return query
}

function buildSearchBody(
  page: number,
  perPage: number,
  statusFilter: ReservationStatusFilter,
  searchQuery: string,
  filter: FilterGroup,
  siteQuery: Record<string, number>,
  contactId?: number,
  dealId?: number
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

  if (contactId) {
    body.contact_id = contactId
  }

  if (dealId) {
    body.deal_id = dealId
  }

  return body
}

export function useReservationsList(options?: {
  contactId?: number
  dealId?: number
  filter?: Ref<FilterGroup | null>
}) {
  const { getPaginated, postPaginated } = useApi()
  const { portalSiteId, portalSiteQuery } = usePortalSiteQuery()
  // Nested on contact/deal detail: keep cross-site (D-RBAC-1 detail carve-out).
  const nestedContext = Boolean(options?.contactId || options?.dealId)
  const activeSiteQuery = computed(() => (nestedContext ? {} : portalSiteQuery.value))
  const activeSiteId = computed(() => (nestedContext ? undefined : portalSiteId.value))
  const searchQuery = ref('')
  const statusFilter = ref<ReservationStatusFilter>('all')
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    `reservations:${options?.contactId ?? ''}:${options?.dealId ?? ''}`,
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiReservation>(
          '/api/reservations/search',
          buildSearchBody(
            page.value,
            perPage.value,
            statusFilter.value,
            searchQuery.value,
            filter.value,
            activeSiteQuery.value,
            options?.contactId,
            options?.dealId
          )
        )
      }

      return getPaginated<ApiReservation>(
        '/api/reservations',
        buildListQuery(
          page.value,
          perPage.value,
          statusFilter.value,
          activeSiteQuery.value,
          options?.contactId,
          options?.dealId
        )
      )
    },
    { watch: [page, perPage, statusFilter, filter, searchQuery, activeSiteId] }
  )

  const paginatedReservations = computed(() => {
    const items = data.value?.data ?? []
    if (hasAdvancedFilter.value) {
      return items
    }

    const q = searchQuery.value.trim().toLowerCase()

    if (!q) {
      return items
    }

    return items.filter(r => [
      r.contact?.name ?? '',
      r.unit?.unit_number ?? '',
      r.unit?.site?.name ?? '',
      r.status
    ].some(v => v.toLowerCase().includes(q)))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedReservations.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter, filter, activeSiteId], () => resetPage())

  return {
    searchQuery,
    statusFilter,
    paginatedReservations,
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

export function reservationStatusColor(status: string) {
  if (status === 'confirmed') return 'success'
  if (status === 'cancelled' || status === 'expired') return 'error'
  return 'warning'
}
