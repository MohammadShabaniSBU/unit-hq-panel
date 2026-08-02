import type { ApiInboxBadge, ApiInboxThreadDetail, ApiInboxThreadSummary } from '~/types/inbox'

const POLL_INTERVAL_MS = 20_000

/**
 * The realtime upgrade path this sprint chose: 20s interval + focus + immediate
 * post-send, merging `updated_after` deltas into the list and the open thread so
 * an inbound reply appears within one cycle unrefreshed. Payload shapes are the
 * same ones a future WebSocket transport would push — swapping transport later
 * changes no consumer code.
 */
export function useInboxSync(params: {
  selectedThreadId: Ref<number | null>
  buildListQuery: (extra: Record<string, string | number>) => Record<string, string | number>
  onThreadsDelta: (updated: Array<ApiInboxThreadSummary>) => void
  onThreadDetail: (detail: ApiInboxThreadDetail) => void
}) {
  const { get, getCursor } = useApi()

  const badge = ref<ApiInboxBadge>({ unread_threads: 0, triage_count: 0 })
  const since = ref(new Date().toISOString())
  const polling = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  function applyDocumentTitle() {
    if (!import.meta.client) {
      return
    }

    const base = 'Unit HQ Portal'
    document.title = badge.value.unread_threads > 0
      ? `(${badge.value.unread_threads}) ${base}`
      : base
  }

  async function fetchBadge() {
    try {
      const response = await get<ApiInboxBadge>('/api/inbox/badge')
      badge.value = response.data
      applyDocumentTitle()
    } catch {
      // Retried next tick — the badge is display-only.
    }
  }

  async function poll() {
    if (polling.value) {
      return
    }

    polling.value = true
    const updatedAfter = since.value
    since.value = new Date().toISOString()

    try {
      const response = await getCursor<ApiInboxThreadSummary>(
        '/api/inbox/threads',
        params.buildListQuery({ updated_after: updatedAfter, per_page: 100 })
      )
      params.onThreadsDelta(response.data)
    } catch {
      since.value = updatedAfter
    }

    const openThreadId = params.selectedThreadId.value
    if (openThreadId !== null) {
      try {
        const response = await get<ApiInboxThreadDetail>(`/api/inbox/threads/${openThreadId}`)
        params.onThreadDetail(response.data)
      } catch {
        // Benign — next cycle retries.
      }
    }

    await fetchBadge()
    polling.value = false
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      poll()
    }
  }

  function start() {
    poll()
    timer = setInterval(poll, POLL_INTERVAL_MS)

    if (import.meta.client) {
      window.addEventListener('focus', poll)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }

    if (import.meta.client) {
      window.removeEventListener('focus', poll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    badge,
    start,
    stop,
    pokeNow: poll,
    fetchBadge
  }
}
