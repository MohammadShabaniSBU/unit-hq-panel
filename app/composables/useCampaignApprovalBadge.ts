const count = ref(0)
let started = false
let timer: ReturnType<typeof setInterval> | null = null

export function useCampaignApprovalBadge() {
  const { get } = useApi()

  async function refresh() {
    try {
      const response = await get<{ count: number }>('/api/campaigns/approval-count')
      count.value = response.data.count
    } catch {
      // Display-only. The next poll retries.
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      void refresh()
    }
  }

  function start() {
    if (started || !import.meta.client) {
      return
    }

    started = true
    void refresh()
    timer = setInterval(() => {
      void refresh()
    }, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  function stop() {
    started = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (import.meta.client) {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    count,
    refresh,
    start,
    stop
  }
}
