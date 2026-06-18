import type { ApiSite } from '~/types/facility'

function matchesSearch(site: ApiSite, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    site.name,
    site.address ?? '',
    site.city ?? '',
    site.country?.name ?? '',
    site.contact_email ?? '',
    site.contact_phone ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useSitesList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'sites',
    () => getPaginated<ApiSite>('/api/sites', { page: page.value, per_page: perPage.value }),
    { watch: [page, perPage] }
  )

  const sites = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(site => matchesSearch(site, searchQuery.value))
  })

  const totalSites = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => sites.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch(searchQuery, () => {
    resetPage()
  })

  return {
    searchQuery,
    sites,
    totalSites,
    showingCount,
    page,
    perPage,
    perPageOptions,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}

export function formatSiteLocation(site: ApiSite) {
  const parts = [site.city, site.country?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}
