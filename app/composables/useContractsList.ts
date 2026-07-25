import type { ApiContract, ContractStatusFilter } from '~/types/contract'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

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

function buildSearchBody(
  page: number,
  perPage: number,
  statusFilter: ContractStatusFilter,
  searchQuery: string,
  filter: FilterGroup,
  contactId?: number,
  dealId?: number
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

  if (contactId) {
    body.contact_id = contactId
  }

  if (dealId) {
    body.deal_id = dealId
  }

  return body
}

export function useContractsList(options?: {
  contactId?: number
  dealId?: number
  filter?: Ref<FilterGroup | null>
}) {
  const { getPaginated, postPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<ContractStatusFilter>('all')
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const hasAdvancedFilter = computed(() => countFilterConditions(filter.value) > 0)

  const { data, pending, error, refresh } = useAsyncData(
    `contracts:${options?.contactId ?? ''}:${options?.dealId ?? ''}`,
    () => {
      if (hasAdvancedFilter.value && filter.value) {
        return postPaginated<ApiContract>(
          '/api/contracts/search',
          buildSearchBody(
            page.value,
            perPage.value,
            statusFilter.value,
            searchQuery.value,
            filter.value,
            options?.contactId,
            options?.dealId
          )
        )
      }

      return getPaginated<ApiContract>(
        '/api/contracts',
        buildListQuery(page.value, perPage.value, statusFilter.value, options?.contactId, options?.dealId)
      )
    },
    { watch: [page, perPage, statusFilter, filter, searchQuery] }
  )

  const paginatedContracts = computed(() => {
    const items = data.value?.data ?? []
    if (hasAdvancedFilter.value) {
      return items
    }

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

  watch([searchQuery, statusFilter, filter], () => resetPage())

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
