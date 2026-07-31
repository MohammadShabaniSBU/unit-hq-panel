import type { ApiInvoiceSeries } from '~/types/invoiceSeries'

export type InvoiceSeriesListStatus = 'active' | 'archived' | 'all'

export function useInvoiceSeriesList(entityId: Ref<number> | ComputedRef<number>) {
  const { get, post, patch } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const statusFilter = ref<InvoiceSeriesListStatus>('active')

  const { data, pending, error, refresh } = useAsyncData(
    () => `invoice-series-${entityId.value}-${statusFilter.value}`,
    () => get<Array<ApiInvoiceSeries>>(
      `/api/legal-entities/${entityId.value}/invoice-series`,
      { status: statusFilter.value }
    ),
    { watch: [entityId, statusFilter] }
  )

  const series = computed(() => data.value?.data ?? [])

  async function setDefault(item: ApiInvoiceSeries) {
    try {
      await patch(`/api/invoice-series/${item.id}`, { is_default: true })
      toast.add({
        title: t('settings.invoiceSeries.setDefaultSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('settings.invoiceSeries.setDefaultError'),
        color: 'error'
      })
      return false
    }
  }

  async function archiveSeries(item: ApiInvoiceSeries) {
    try {
      await post(`/api/invoice-series/${item.id}/archive`, {})
      toast.add({
        title: t('settings.invoiceSeries.archiveSuccess'),
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
      const message = fetchError.data?.errors?.invoice_series?.[0]
        ?? fetchError.data?.message
        ?? t('settings.invoiceSeries.archiveError')
      toast.add({
        title: String(message),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveSeries(item: ApiInvoiceSeries) {
    try {
      await post(`/api/invoice-series/${item.id}/unarchive`, {})
      toast.add({
        title: t('settings.invoiceSeries.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('settings.invoiceSeries.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  return {
    statusFilter,
    series,
    pending,
    error,
    refresh,
    setDefault,
    archiveSeries,
    unarchiveSeries
  }
}
