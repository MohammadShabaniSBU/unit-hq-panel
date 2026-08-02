import type {
  ApiContract,
  ContractAttentionFilter,
  ContractsListMeta,
  ContractStatusFilter
} from '~/types/contract'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: ContractStatusFilter,
  attention: ContractAttentionFilter,
  contactId?: number,
  dealId?: number
) {
  const query: Record<string, string | number> = { page, per_page: perPage }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  if (attention) {
    query.attention = attention
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
  attention: ContractAttentionFilter,
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

  if (attention) {
    body.attention = attention
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
  const attentionFilter = ref<ContractAttentionFilter>(null)
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
            attentionFilter.value,
            searchQuery.value,
            filter.value,
            options?.contactId,
            options?.dealId
          )
        ) as Promise<{ message: string, data: Array<ApiContract>, meta: ContractsListMeta }>
      }

      return getPaginated<ApiContract>(
        '/api/contracts',
        buildListQuery(
          page.value,
          perPage.value,
          statusFilter.value,
          attentionFilter.value,
          options?.contactId,
          options?.dealId
        )
      ) as Promise<{ message: string, data: Array<ApiContract>, meta: ContractsListMeta }>
    },
    { watch: [page, perPage, statusFilter, attentionFilter, filter, searchQuery] }
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
  const declinedCount = computed(() => (data.value?.meta as ContractsListMeta | undefined)?.declined_count ?? 0)
  const postCancellationCount = computed(
    () => (data.value?.meta as ContractsListMeta | undefined)?.post_cancellation_count ?? 0
  )

  watch([searchQuery, statusFilter, attentionFilter, filter], () => resetPage())

  function setAttention(next: ContractAttentionFilter) {
    attentionFilter.value = attentionFilter.value === next ? null : next
  }

  return {
    searchQuery,
    statusFilter,
    attentionFilter,
    setAttention,
    declinedCount,
    postCancellationCount,
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
  if (status === 'awaiting_signature') return 'warning'
  if (status === 'notice_given') return 'warning'
  if (status === 'pending') return 'info'
  if (status === 'ended') return 'error'
  if (status === 'cancelled') return 'neutral'
  return 'neutral'
}
