/**
 * Portal global site selector → optional API `site_id` query/body.
 * undefined / All sites → empty object (no filter param).
 */
export function usePortalSiteQuery() {
  const siteContext = useSiteContextStore()

  const portalSiteId = computed(() => {
    const id = siteContext.selectedSiteId
    return typeof id === 'number' ? id : undefined
  })

  const portalSiteQuery = computed((): Record<string, number> => {
    return portalSiteId.value !== undefined ? { site_id: portalSiteId.value } : {}
  })

  return {
    portalSiteId,
    portalSiteQuery
  }
}
