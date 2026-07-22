import type { ReservationStatus } from '~/types/reservation'
import type { ReservationBoard, ReservationBoardColumn, ReservationCard } from '~/types/reservation-board'

const PER_COLUMN = 30

export function useReservationBoard() {
  const { get, patch } = useApi()

  const searchQuery = ref('')
  const columns = ref<Array<ReservationBoardColumn>>([])
  const pending = ref(false)
  const error = ref<unknown>(null)
  const columnLoading = ref<Partial<Record<ReservationStatus, boolean>>>({})

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

      const response = await get<ReservationBoard>('/api/reservations/board', query)
      columns.value = response.data.columns
    } catch (err) {
      error.value = err
      columns.value = []
    } finally {
      pending.value = false
    }
  }

  async function loadMore(status: ReservationStatus) {
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

      const response = await get<ReservationBoardColumn>(
        `/api/reservations/board/columns/${status}`,
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

  async function patchStatus(id: number, status: ReservationStatus): Promise<ReservationCard> {
    const response = await patch<ReservationCard>(`/api/reservations/${id}/status`, { status })
    return response.data
  }

  function setColumnCards(status: ReservationStatus, cards: Array<ReservationCard>) {
    columns.value = columns.value.map((column) => {
      if (column.status !== status) {
        return column
      }

      return { ...column, cards }
    })
  }

  function adjustTotals(from: ReservationStatus, to: ReservationStatus) {
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

  function replaceCard(status: ReservationStatus, card: ReservationCard) {
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

  function findColumn(status: ReservationStatus): ReservationBoardColumn | undefined {
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
