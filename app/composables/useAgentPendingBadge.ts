import type { AgentPendingBadge } from '~/types/agents'

const POLL_INTERVAL_MS = 20_000

const pendingCount = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
let started = false

export function useAgentPendingBadge() {
  const { get } = useApi()

  async function refresh() {
    try {
      const response = await get<AgentPendingBadge>('/api/agent-pending-actions/badge')
      pendingCount.value = response.data.pending
    } catch {
      // Display-only — retried next cycle.
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  function start() {
    if (started) {
      return
    }
    started = true
    void refresh()
    timer = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    if (import.meta.client) {
      window.addEventListener('focus', refresh)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    started = false

    if (import.meta.client) {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    pendingCount,
    refresh,
    start,
    stop
  }
}
