import type { ApiLease, LeaseStatusFilter } from '~/types/lease'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: LeaseStatusFilter,
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

export function useLeasesList(options?: { contactId?: number; dealId?: number }) {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<LeaseStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    `leases:${options?.contactId ?? ''}:${options?.dealId ?? ''}`,
    () => getPaginated<ApiLease>(
      '/api/leases',
      buildListQuery(page.value, perPage.value, statusFilter.value, options?.contactId, options?.dealId)
    ),
    { watch: [page, perPage, statusFilter] }
  )

  const paginatedLeases = computed(() => {
    const items = data.value?.data ?? []
    const q = searchQuery.value.trim().toLowerCase()

    if (!q) {
      return items
    }

    return items.filter(l => [
      l.contact?.name ?? '',
      l.unit?.unit_number ?? '',
      l.unit?.site?.name ?? '',
      l.status
    ].some(v => v.toLowerCase().includes(q)))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedLeases.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter], () => resetPage())

  return {
    searchQuery,
    statusFilter,
    paginatedLeases,
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

export function leaseStatusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'moved_out' || status === 'terminated') return 'error'
  if (status === 'expired') return 'warning'
  return 'neutral'
}
