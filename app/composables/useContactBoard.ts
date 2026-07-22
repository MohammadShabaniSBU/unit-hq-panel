import type { ContactLifecycleStatus } from '~/types/contact'
import type { ContactBoard, ContactBoardColumn, ContactCard } from '~/types/contact-board'

const PER_COLUMN = 30

export function useContactBoard() {
  const { get, patch } = useApi()

  const searchQuery = ref('')
  const columns = ref<Array<ContactBoardColumn>>([])
  const pending = ref(false)
  const error = ref<unknown>(null)
  const columnLoading = ref<Partial<Record<ContactLifecycleStatus, boolean>>>({})

  async function reload() {
    pending.value = true
    error.value = null

    try {
      const query: Record<string, string | number> = {
        per_column: PER_COLUMN
      }

      const search = searchQuery.value.trim()
      if (search) {
        query.search = search
      }

      const response = await get<ContactBoard>('/api/contacts/board', query)
      columns.value = response.data.columns
    } catch (err) {
      error.value = err
      columns.value = []
    } finally {
      pending.value = false
    }
  }

  async function loadMore(status: ContactLifecycleStatus) {
    const column = columns.value.find(item => item.status === status)
    if (!column || !column.has_more || !column.next_cursor || columnLoading.value[status]) {
      return
    }

    columnLoading.value = { ...columnLoading.value, [status]: true }

    try {
      const query: Record<string, string | number> = {
        per_column: PER_COLUMN,
        cursor: column.next_cursor
      }

      const search = searchQuery.value.trim()
      if (search) {
        query.search = search
      }

      const response = await get<ContactBoardColumn>(
        `/api/contacts/board/columns/${status}`,
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

  async function patchStatus(id: number, status: ContactLifecycleStatus): Promise<ContactCard> {
    const response = await patch<ContactCard>(`/api/contacts/${id}/status`, { status })
    return response.data
  }

  function setColumnCards(status: ContactLifecycleStatus, cards: Array<ContactCard>) {
    columns.value = columns.value.map((column) => {
      if (column.status !== status) {
        return column
      }

      return { ...column, cards }
    })
  }

  function adjustTotals(from: ContactLifecycleStatus, to: ContactLifecycleStatus) {
    columns.value = columns.value.map((column) => {
      if (column.status === from) {
        return { ...column, total: Math.max(0, column.total - 1) }
      }

      if (column.status === to) {
        return { ...column, total: column.total + 1 }
      }

      return column
    })
  }

  function replaceCard(status: ContactLifecycleStatus, card: ContactCard) {
    columns.value = columns.value.map((column) => {
      if (column.status !== status) {
        return column
      }

      return {
        ...column,
        cards: column.cards.map(existing => (existing.id === card.id ? card : existing))
      }
    })
  }

  function findColumn(status: ContactLifecycleStatus): ContactBoardColumn | undefined {
    return columns.value.find(column => column.status === status)
  }

  watch(searchQuery, () => {
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
    patchStatus,
    setColumnCards,
    adjustTotals,
    replaceCard,
    findColumn
  }
}
