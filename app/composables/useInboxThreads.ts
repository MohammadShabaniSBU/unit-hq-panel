import type { ApiInboxAssignee, ApiInboxThreadSummary, InboxChannelTab, InboxFilter } from '~/types/inbox'

const PER_PAGE = 25

function toQueryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function byRecency(a: ApiInboxThreadSummary, b: ApiInboxThreadSummary): number {
  const diff = new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime()
  return diff !== 0 ? diff : b.id - a.id
}

/**
 * Thread list pane: query-string synced filters, cursor pagination, and the
 * "N new" pill merge for poll deltas (the moving-inbox rule — new arrivals never
 * yank scroll position; they queue until the operator clicks to reveal).
 */
export function useInboxThreads() {
  const { getCursor, post } = useApi()
  const route = useRoute()
  const router = useRouter()

  const channel = ref<InboxChannelTab>((toQueryString(route.query.channel) || 'all') as InboxChannelTab)
  const filter = ref<InboxFilter>((toQueryString(route.query.filter) || 'all') as InboxFilter)
  const unreadOnly = ref(route.query.unread === '1')
  const searchQuery = ref(toQueryString(route.query.q))
  const selectedThreadId = ref<number | null>(
    route.query.thread ? Number(route.query.thread) : null
  )

  const threads = ref<Array<ApiInboxThreadSummary>>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<unknown>(null)
  const pendingNewThreads = ref<Array<ApiInboxThreadSummary>>([])
  const newArrivalsCount = computed(() => pendingNewThreads.value.length)
  const hasMore = computed(() => nextCursor.value !== null)

  function syncQueryString() {
    const query: Record<string, string> = {}

    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') {
        query[key] = value
      }
    }

    if (channel.value === 'all') {
      delete query.channel
    } else {
      query.channel = channel.value
    }

    if (filter.value === 'all') {
      delete query.filter
    } else {
      query.filter = filter.value
    }

    if (unreadOnly.value) {
      query.unread = '1'
    } else {
      delete query.unread
    }

    const trimmedSearch = searchQuery.value.trim()
    if (trimmedSearch) {
      query.q = trimmedSearch
    } else {
      delete query.q
    }

    if (selectedThreadId.value !== null) {
      query.thread = String(selectedThreadId.value)
    } else {
      delete query.thread
    }

    router.replace({ query })
  }

  function buildQuery(extra: Record<string, string | number> = {}) {
    const query: Record<string, string | number> = { per_page: PER_PAGE, ...extra }

    if (channel.value !== 'all') {
      query.channel = channel.value
    }

    if (filter.value !== 'all') {
      query.filter = filter.value
    }

    if (unreadOnly.value) {
      query.unread = 1
    }

    const trimmedSearch = searchQuery.value.trim()
    if (trimmedSearch) {
      query.q = trimmedSearch
    }

    return query
  }

  async function load() {
    pending.value = true
    error.value = null

    try {
      const response = await getCursor<ApiInboxThreadSummary>('/api/inbox/threads', buildQuery())
      threads.value = response.data
      nextCursor.value = response.meta.next_cursor
      pendingNewThreads.value = []
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
      const response = await getCursor<ApiInboxThreadSummary>(
        '/api/inbox/threads',
        buildQuery({ cursor: nextCursor.value })
      )
      threads.value = [...threads.value, ...response.data]
      nextCursor.value = response.meta.next_cursor
    } finally {
      loadingMore.value = false
    }
  }

  /**
   * Merge a poller's `updated_after` payload. Existing rows update in place
   * (no reorder — the mid-scroll jump this sprint's README explicitly forbids);
   * genuinely new threads queue behind the "N new" pill until revealed.
   */
  function mergeDelta(updated: Array<ApiInboxThreadSummary>) {
    if (updated.length === 0) {
      return
    }

    const currentIds = new Set(threads.value.map(t => t.id))
    const updatesById = new Map(updated.map(t => [t.id, t]))
    const arrivals: Array<ApiInboxThreadSummary> = []

    for (const thread of updated) {
      if (!currentIds.has(thread.id)) {
        arrivals.push(thread)
      }
    }

    if (arrivals.length > 0) {
      const queuedIds = new Set(pendingNewThreads.value.map(t => t.id))
      const freshArrivals = arrivals.filter(t => !queuedIds.has(t.id))
      pendingNewThreads.value = [...freshArrivals, ...pendingNewThreads.value]
    }

    threads.value = threads.value.map(thread => updatesById.get(thread.id) ?? thread)
  }

  function revealNewArrivals() {
    if (pendingNewThreads.value.length === 0) {
      return
    }

    threads.value = [...pendingNewThreads.value, ...threads.value].sort(byRecency)
    pendingNewThreads.value = []
  }

  function markReadLocally(threadId: number) {
    threads.value = threads.value.map(thread =>
      thread.id === threadId ? { ...thread, unread_count: 0 } : thread
    )
  }

  function updateAssignmentLocally(threadId: number, assignee: ApiInboxAssignee | null) {
    threads.value = threads.value.map(thread =>
      thread.id === threadId ? { ...thread, assigned_employee: assignee } : thread
    )
  }

  async function assignThread(threadId: number, employeeId: number | null) {
    const response = await post<{ id: number, assigned_employee: ApiInboxAssignee | null }>(
      `/api/inbox/threads/${threadId}/assign`,
      { employee_id: employeeId }
    )
    updateAssignmentLocally(threadId, response.data.assigned_employee)
    return response.data.assigned_employee
  }

  function selectThread(threadId: number | null) {
    selectedThreadId.value = threadId
    syncQueryString()
  }

  const orderedVisibleIds = computed(() => threads.value.map(t => t.id))

  function selectAdjacent(step: 1 | -1) {
    const ids = orderedVisibleIds.value
    if (ids.length === 0) {
      return
    }

    const currentIndex = selectedThreadId.value !== null ? ids.indexOf(selectedThreadId.value) : -1
    const nextIndex = currentIndex === -1
      ? 0
      : Math.min(Math.max(currentIndex + step, 0), ids.length - 1)

    selectThread(ids[nextIndex] ?? null)
  }

  watch([channel, filter, unreadOnly, searchQuery], () => {
    syncQueryString()
    load()
  })

  return {
    channel,
    filter,
    unreadOnly,
    searchQuery,
    selectedThreadId,
    threads,
    pending,
    loadingMore,
    error,
    hasMore,
    newArrivalsCount,
    buildQuery,
    load,
    loadMore,
    mergeDelta,
    revealNewArrivals,
    markReadLocally,
    updateAssignmentLocally,
    assignThread,
    selectThread,
    selectAdjacent
  }
}
