import type { ApiInboxBadge } from '~/types/inbox'

const CHANNEL = 'inbox'
const TITLE_BASE = 'Keevaris Portal'

const badge = ref<ApiInboxBadge>({
  unread_threads: 0,
  triage_count: 0,
  active_calls: [],
  pending_wrapups: []
})
let started = false
let originalFaviconHref: string | null = null
let reconnectHandler: (() => void) | null = null

/**
 * App-wide inbox badge: sidebar unread count, triage dot, document title,
 * and favicon unread indicator. Initial REST fetch, then Reverb pings
 * (`inbox.badge.updated`) plus focus / visibility / reconnect refetch.
 */
export function useInboxBadge() {
  const { get } = useApi()
  const echo = useEcho()

  function applyDocumentTitle() {
    if (!import.meta.client) {
      return
    }

    document.title = badge.value.unread_threads > 0
      ? `(${badge.value.unread_threads}) ${TITLE_BASE}`
      : TITLE_BASE
  }

  function applyFaviconDot() {
    if (!import.meta.client) {
      return
    }

    const link = document.querySelector<HTMLLinkElement>('link[rel=\'icon\']')
    if (!link) {
      return
    }

    if (originalFaviconHref === null) {
      originalFaviconHref = link.href
    }

    if (badge.value.unread_threads <= 0) {
      link.href = originalFaviconHref
      return
    }

    const img = new Image()
    img.onload = () => {
      const size = 32
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }

      ctx.drawImage(img, 0, 0, size, size)
      const radius = 5
      const cx = size - radius - 1
      const cy = radius + 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      link.href = canvas.toDataURL('image/png')
    }
    img.src = originalFaviconHref
  }

  async function refresh() {
    try {
      const response = await get<ApiInboxBadge>('/api/inbox/badge')
      badge.value = {
        unread_threads: response.data.unread_threads,
        triage_count: response.data.triage_count,
        active_calls: response.data.active_calls ?? [],
        pending_wrapups: response.data.pending_wrapups ?? []
      }
      applyDocumentTitle()
      applyFaviconDot()
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

    echo.private(CHANNEL).listen('.inbox.badge.updated', () => {
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
    badge,
    unreadThreads: computed(() => badge.value.unread_threads),
    triageCount: computed(() => badge.value.triage_count),
    refresh,
    start,
    stop
  }
}
