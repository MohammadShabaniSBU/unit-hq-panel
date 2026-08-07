import type { ContractStatus } from '~/types/contract'
import type { ContractBoard, ContractBoardColumn, ContractCard } from '~/types/contract-board'

const PER_COLUMN = 30

export function useContractBoard() {
  const { get } = useApi()
  const { portalSiteId, portalSiteQuery } = usePortalSiteQuery()

  const searchQuery = ref('')
  const columns = ref<Array<ContractBoardColumn>>([])
  const pending = ref(false)
  const error = ref<unknown>(null)
  const columnLoading = ref<Partial<Record<ContractStatus, boolean>>>({})

  async function reload() {
    pending.value = true
    error.value = null

    try {
      const query: Record<string, string | number> = {
        per_column: PER_COLUMN,
        ...portalSiteQuery.value
      }

      const search = searchQuery.value.trim()
      if (search) {
        query.search = search
      }

      const response = await get<ContractBoard>('/api/contracts/board', query)
      columns.value = response.data.columns
    } catch (err) {
      error.value = err
      columns.value = []
    } finally {
      pending.value = false
    }
  }

  async function loadMore(status: ContractStatus) {
    const column = columns.value.find(item => item.status === status)
    if (!column || !column.has_more || !column.next_cursor || columnLoading.value[status]) {
      return
    }

    columnLoading.value = { ...columnLoading.value, [status]: true }

    try {
      const query: Record<string, string | number> = {
        per_column: PER_COLUMN,
        cursor: column.next_cursor,
        ...portalSiteQuery.value
      }

      const search = searchQuery.value.trim()
      if (search) {
        query.search = search
      }

      const response = await get<ContractBoardColumn>(
        `/api/contracts/board/columns/${status}`,
        query
      )
      const page = response.data

      columns.value = columns.value.map((item) => {
        if (item.status !== status) {
          return item
        }

        return {
          ...item,
          total: page.total,
          cards: [...item.cards, ...page.cards],
          next_cursor: page.next_cursor,
          has_more: page.has_more
        }
      })
    } finally {
      columnLoading.value = { ...columnLoading.value, [status]: false }
    }
  }

  function setColumnCards(status: ContractStatus, cards: Array<ContractCard>) {
    columns.value = columns.value.map((column) => {
      if (column.status !== status) {
        return column
      }

      return { ...column, cards }
    })
  }

  function findColumn(status: ContractStatus): ContractBoardColumn | undefined {
    return columns.value.find(column => column.status === status)
  }

  watch([searchQuery, portalSiteId], () => {
    reload()
  })

  return {
    searchQuery,
    columns,
    pending,
    error,
    columnLoading,
    reload,
    loadMore,
    setColumnCards,
    findColumn
  }
}
