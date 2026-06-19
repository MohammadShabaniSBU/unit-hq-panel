import type { ApiReservation, ReservationStatusFilter } from '~/types/reservation'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: ReservationStatusFilter,
  contactId?: number,
  dealId?: number
) {
  const query: Record<string, string | number> = { page, per_page: perPage }

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

export function useReservationsList(options?: { contactId?: number; dealId?: number }) {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<ReservationStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    `reservations:${options?.contactId ?? ''}:${options?.dealId ?? ''}`,
    () => getPaginated<ApiReservation>(
      '/api/reservations',
      buildListQuery(page.value, perPage.value, statusFilter.value, options?.contactId, options?.dealId)
    ),
    { watch: [page, perPage, statusFilter] }
  )

  const paginatedReservations = computed(() => {
    const items = data.value?.data ?? []
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

  watch([searchQuery, statusFilter], () => resetPage())

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
