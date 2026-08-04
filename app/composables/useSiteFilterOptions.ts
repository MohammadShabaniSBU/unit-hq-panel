/**
 * Site select items for page filters, with "All Sites" only when company-wide.
 */
export function useSiteFilterOptions(allSitesLabel: MaybeRefOrGetter<string>) {
  const { items: siteItems } = useOptions('/api/sites/options')
  const { isCompanyWide } = usePermissions()

  const siteOptions = computed(() => {
    const sites = siteItems.value.map(s => ({
      label: s.label,
      value: Number(s.value) as number | null
    }))

    if (isCompanyWide.value) {
      return [
        { label: toValue(allSitesLabel), value: null as number | null },
        ...sites
      ]
    }

    return sites
  })

  return { siteItems, siteOptions, isCompanyWide }
}
