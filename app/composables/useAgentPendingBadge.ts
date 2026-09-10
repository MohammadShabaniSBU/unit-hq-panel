import type { AgentPendingBadge } from '~/types/agents'

const CHANNEL = 'agent-pending-actions'

const pendingCount = ref(0)
let started = false
let reconnectHandler: (() => void) | null = null

export function useAgentPendingBadge() {
  const { get } = useApi()
  const echo = useEcho()

  async function refresh() {
    try {
      const response = await get<AgentPendingBadge>('/api/agent-pending-actions/badge')
      pendingCount.value = response.data.pending
    } catch {
      // Display-only — next ping / focus retries.
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  function subscribe() {
    if (!import.meta.client) {
      return
    }

    echo.private(CHANNEL).listen('.agent.pending.badge.updated', () => {
      void refresh()
    })

    const pusher = echo.connector?.pusher
    if (pusher?.connection) {
      reconnectHandler = () => {
        void refresh()
      }
      pusher.connection.bind('connected', reconnectHandler)
    }
  }

  function unsubscribe() {
    if (!import.meta.client) {
      return
    }

    echo.leave(CHANNEL)

    if (reconnectHandler) {
      const pusher = echo.connector?.pusher
      pusher?.connection?.unbind('connected', reconnectHandler)
      reconnectHandler = null
    }
  }

  function start() {
    if (started) {
      return
    }
    started = true
    void refresh()
    subscribe()

    if (import.meta.client) {
      window.addEventListener('focus', refresh)
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  function stop() {
    unsubscribe()
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
