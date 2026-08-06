import { defineStore } from 'pinia'
import type { InsightNavItem } from '~/types/insights'

export const useInsightRegistryStore = defineStore('insightRegistry', () => {
  const items = ref<Array<InsightNavItem>>([])
  const pending = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  let inflight: Promise<void> | null = null

  async function fetch(): Promise<void> {
    if (inflight) {
      return inflight
    }

    const { get } = useApi()
    pending.value = true
    error.value = null

    inflight = (async () => {
      try {
        const res = await get<Array<InsightNavItem>>('/api/insights')
        items.value = res.data ?? []
        loaded.value = true
      } catch (err: unknown) {
        const fetchError = err as { data?: { message?: string } }
        error.value = fetchError.data?.message ?? 'Failed to load insights'
        // Keep previous items on failure so the nav does not flicker empty.
        if (!loaded.value) {
          items.value = []
        }
      } finally {
        pending.value = false
        inflight = null
      }
    })()

    return inflight
  }

  async function refresh(): Promise<void> {
    await fetch()
  }

  function byKey(key: string): InsightNavItem | null {
    return items.value.find(item => item.key === key) ?? null
  }

  function dashboardItem(): InsightNavItem | null {
    return items.value.find(item => item.native_key === 'dashboard') ?? null
  }

  function reset() {
    items.value = []
    pending.value = false
    error.value = null
    loaded.value = false
    inflight = null
  }

  return {
    items,
    pending,
    error,
    loaded,
    fetch,
    refresh,
    byKey,
    dashboardItem,
    reset
  }
})
