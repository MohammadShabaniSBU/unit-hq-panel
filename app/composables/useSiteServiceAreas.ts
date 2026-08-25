import type { ApiSiteServiceArea, SiteServiceAreaListStatus } from '~/types/facility'

export function useSiteServiceAreas(siteId: Ref<number> | ComputedRef<number>) {
  const { get, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const statusFilter = ref<SiteServiceAreaListStatus>('active')

  const { data, pending, error, refresh } = useAsyncData(
    () => `site-service-areas-${siteId.value}-${statusFilter.value}`,
    () => get<Array<ApiSiteServiceArea>>(
      `/api/sites/${siteId.value}/service-areas`,
      { status: statusFilter.value }
    ),
    { watch: [siteId, statusFilter] }
  )

  const areas = computed(() => data.value?.data ?? [])

  async function archiveArea(item: ApiSiteServiceArea) {
    try {
      await post(`/api/site-service-areas/${item.id}/archive`, {})
      toast.add({
        title: t('facility.serviceAreas.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('facility.serviceAreas.archiveError'),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveArea(item: ApiSiteServiceArea) {
    try {
      await post(`/api/site-service-areas/${item.id}/unarchive`, {})
      toast.add({
        title: t('facility.serviceAreas.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('facility.serviceAreas.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  return {
    statusFilter,
    areas,
    pending,
    error,
    refresh,
    archiveArea,
    unarchiveArea
  }
}
