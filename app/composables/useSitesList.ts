import type { ApiSite } from '~/types/facility'

export type SiteListStatus = 'active' | 'archived' | 'all'

function matchesSearch(site: ApiSite, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    site.name,
    site.code ?? '',
    site.address ?? '',
    site.city ?? '',
    site.state_region ?? '',
    site.postal_code ?? '',
    site.country?.name ?? '',
    site.contact_email ?? '',
    site.contact_phone ?? '',
    site.timezone ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useSitesList() {
  const { getPaginated, post, del } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const searchQuery = ref('')
  const statusFilter = ref<SiteListStatus>('active')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'sites',
    () => getPaginated<ApiSite>('/api/sites', {
      page: page.value,
      per_page: perPage.value,
      status: statusFilter.value
    }),
    { watch: [page, perPage, statusFilter] }
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

  watch(statusFilter, () => {
    resetPage()
  })

  async function archiveSite(site: ApiSite) {
    try {
      await post(`/api/sites/${site.id}/archive`, {})
      toast.add({
        title: t('pages.sites.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string | number>>
        }
      }
      const message = fetchError.data?.errors?.site?.[0]
        ?? fetchError.data?.message
        ?? t('pages.sites.archiveError')
      toast.add({
        title: String(message),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveSite(site: ApiSite) {
    try {
      await post(`/api/sites/${site.id}/unarchive`, {})
      toast.add({
        title: t('pages.sites.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('pages.sites.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  async function deleteSite(site: ApiSite) {
    try {
      await del(`/api/sites/${site.id}`)
      toast.add({
        title: t('pages.sites.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string | number>>
        }
      }
      const message = fetchError.data?.errors?.site?.[0]
        ?? fetchError.data?.message
        ?? t('pages.sites.archiveError')
      toast.add({
        title: String(message),
        color: 'error'
      })
      return false
    }
  }

  return {
    searchQuery,
    statusFilter,
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
    archiveSite,
    unarchiveSite,
    deleteSite,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}

export function formatSiteLocation(site: ApiSite) {
  const parts = [site.city, site.state_region, site.country?.name].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}
