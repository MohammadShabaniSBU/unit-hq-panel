import { defineStore } from 'pinia'

const SITE_KEY = 'unit-hq.site-context.selected'

function readStoredSiteId(): number | null | undefined {
  if (!import.meta.client) {
    return undefined
  }

  const raw = localStorage.getItem(SITE_KEY)
  if (raw === null) {
    return undefined
  }
  if (raw === 'all') {
    return null
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Global portal site context. null = All Sites; number = specific site.
 * undefined = not yet reconciled with granted options.
 */
export const useSiteContextStore = defineStore('siteContext', () => {
  const selectedSiteId = ref<number | null | undefined>(readStoredSiteId())

  function setSelectedSiteId(siteId: number | null) {
    selectedSiteId.value = siteId

    if (import.meta.client) {
      localStorage.setItem(SITE_KEY, siteId === null ? 'all' : String(siteId))
    }
  }

  function reconcile(options: Array<{ value: number }>, companyWide: boolean) {
    const ids = options.map(o => o.value)

    if (companyWide) {
      if (selectedSiteId.value === undefined) {
        setSelectedSiteId(null)
        return
      }
      if (selectedSiteId.value !== null && !ids.includes(selectedSiteId.value)) {
        setSelectedSiteId(null)
      }
      return
    }

    if (ids.length === 0) {
      selectedSiteId.value = null
      return
    }

    if (ids.length === 1) {
      setSelectedSiteId(ids[0]!)
      return
    }

    if (
      selectedSiteId.value === undefined
      || selectedSiteId.value === null
      || !ids.includes(selectedSiteId.value)
    ) {
      setSelectedSiteId(ids[0]!)
    }
  }

  function reset() {
    selectedSiteId.value = undefined

    if (import.meta.client) {
      localStorage.removeItem(SITE_KEY)
    }
  }

  return {
    selectedSiteId,
    setSelectedSiteId,
    reconcile,
    reset
  }
})
