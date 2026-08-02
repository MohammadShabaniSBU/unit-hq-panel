import type {
  ApiCommsTriageDetail,
  ApiCommsTriageDiscardResult,
  ApiCommsTriageResolveResult,
  ApiCommsTriageSummary
} from '~/types/inbox'

/**
 * Pending unmatched-inbound queue: list, detail, and the three S10 resolutions.
 */
export function useInboxTriage() {
  const { get, getCursor, post } = useApi()

  const items = ref<Array<ApiCommsTriageSummary>>([])
  const selectedId = ref<number | null>(null)
  const detail = ref<ApiCommsTriageDetail | null>(null)
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const detailPending = ref(false)
  const resolving = ref(false)
  const error = ref<unknown>(null)

  const hasMore = computed(() => nextCursor.value !== null)
  const selected = computed(() => items.value.find(item => item.id === selectedId.value) ?? null)

  async function load() {
    pending.value = true
    error.value = null
    try {
      const response = await getCursor<ApiCommsTriageSummary>('/api/comms-triage', { per_page: 25 })
      items.value = response.data
      nextCursor.value = response.meta.next_cursor
    } catch (err) {
      error.value = err
    } finally {
      pending.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) {
      return
    }

    loadingMore.value = true
    try {
      const response = await getCursor<ApiCommsTriageSummary>('/api/comms-triage', {
        per_page: 25,
        cursor: nextCursor.value
      })
      const existing = new Set(items.value.map(item => item.id))
      for (const row of response.data) {
        if (!existing.has(row.id)) {
          items.value.push(row)
        }
      }
      nextCursor.value = response.meta.next_cursor
    } catch (err) {
      error.value = err
    } finally {
      loadingMore.value = false
    }
  }

  async function select(id: number | null) {
    selectedId.value = id
    detail.value = null

    if (id === null) {
      return
    }

    detailPending.value = true
    try {
      const response = await get<ApiCommsTriageDetail>(`/api/comms-triage/${id}`)
      detail.value = response.data
    } catch (err) {
      error.value = err
      detail.value = null
    } finally {
      detailPending.value = false
    }
  }

  function removeLocal(id: number) {
    items.value = items.value.filter(item => item.id !== id)
    if (selectedId.value === id) {
      selectedId.value = null
      detail.value = null
    }
  }

  async function attach(contactId: number): Promise<ApiCommsTriageResolveResult | null> {
    if (selectedId.value === null) {
      return null
    }

    resolving.value = true
    try {
      const id = selectedId.value
      const response = await post<ApiCommsTriageResolveResult>(`/api/comms-triage/${id}/attach`, {
        contact_id: contactId
      })
      removeLocal(id)
      return response.data
    } catch (err) {
      error.value = err
      return null
    } finally {
      resolving.value = false
    }
  }

  async function createAndAttach(names: {
    first_name?: string
    last_name?: string
  }): Promise<ApiCommsTriageResolveResult | null> {
    if (selectedId.value === null) {
      return null
    }

    resolving.value = true
    try {
      const id = selectedId.value
      const response = await post<ApiCommsTriageResolveResult>(
        `/api/comms-triage/${id}/create-and-attach`,
        names
      )
      removeLocal(id)
      return response.data
    } catch (err) {
      error.value = err
      return null
    } finally {
      resolving.value = false
    }
  }

  async function discard(reason?: string): Promise<ApiCommsTriageDiscardResult | null> {
    if (selectedId.value === null) {
      return null
    }

    resolving.value = true
    try {
      const id = selectedId.value
      const body: Record<string, unknown> = {}
      if (reason !== undefined && reason.trim() !== '') {
        body.reason = reason.trim()
      }
      const response = await post<ApiCommsTriageDiscardResult>(`/api/comms-triage/${id}/discard`, body)
      removeLocal(id)
      return response.data
    } catch (err) {
      error.value = err
      return null
    } finally {
      resolving.value = false
    }
  }

  return {
    items,
    selectedId,
    selected,
    detail,
    pending,
    loadingMore,
    detailPending,
    resolving,
    hasMore,
    error,
    load,
    loadMore,
    select,
    attach,
    createAndAttach,
    discard
  }
}
