import type { ApiInboxBadge } from '~/types/inbox'

const POLL_INTERVAL_MS = 20_000
const TITLE_BASE = 'Unit HQ Portal'

const badge = ref<ApiInboxBadge>({ unread_threads: 0, triage_count: 0 })
let timer: ReturnType<typeof setInterval> | null = null
let started = false
let originalFaviconHref: string | null = null

/**
 * App-wide inbox badge poller: sidebar unread count, triage dot, document title,
 * and favicon unread indicator. Shared across tabs via each tab's own 20s poll —
 * within one cycle both stay accurate without WebSockets.
 */
export function useInboxBadge() {
  const { get } = useApi()

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
      badge.value = response.data
      applyDocumentTitle()
      applyFaviconDot()
    } catch {
      // Display-only — retried next cycle.
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      refresh()
    }
  }

  function start() {
    if (started) {
      return
    }
    started = true
    refresh()
    timer = setInterval(refresh, POLL_INTERVAL_MS)

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
    badge,
    unreadThreads: computed(() => badge.value.unread_threads),
    triageCount: computed(() => badge.value.triage_count),
    refresh,
    start,
    stop
  }
}
