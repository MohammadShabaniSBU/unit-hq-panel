import type { ApiContract, ContractStatusFilter } from '~/types/contract'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: ContractStatusFilter,
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

export function useContractsList(options?: { contactId?: number; dealId?: number }) {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<ContractStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    `contracts:${options?.contactId ?? ''}:${options?.dealId ?? ''}`,
    () => getPaginated<ApiContract>(
      '/api/contracts',
      buildListQuery(page.value, perPage.value, statusFilter.value, options?.contactId, options?.dealId)
    ),
    { watch: [page, perPage, statusFilter] }
  )

  const paginatedContracts = computed(() => {
    const items = data.value?.data ?? []
    const q = searchQuery.value.trim().toLowerCase()

    if (!q) {
      return items
    }

    return items.filter(c => [
      c.contact?.name ?? '',
      c.items?.find(i => i.item_type === 'unit') ? String((c.items!.find(i => i.item_type === 'unit')!.item as { unit_number?: string })?.unit_number ?? '') : '',
      c.status
    ].some(v => v.toLowerCase().includes(q)))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedContracts.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter], () => resetPage())

  return {
    searchQuery,
    statusFilter,
    paginatedContracts,
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

export function contractStatusColor(status: string) {
  if (status === 'active') return 'success'
  if (status === 'moved_out' || status === 'terminated') return 'error'
  if (status === 'expired') return 'warning'
  return 'neutral'
}
