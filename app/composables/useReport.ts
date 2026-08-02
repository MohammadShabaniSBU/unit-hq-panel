import type { ReportFilters, ReportResult } from '~/types/report'

function buildQuery(
  filters: ReportFilters,
  extras: Record<string, string | number> = {}
): Record<string, string | number> {
  const query: Record<string, string | number> = { ...extras }

  if (filters.from) {
    query.from = filters.from
  }
  if (filters.to) {
    query.to = filters.to
  }
  if (filters.as_of) {
    query.as_of = filters.as_of
  }

  return query
}

function withSiteIds(baseUrl: string, siteIds: Array<number> | undefined): string {
  if (!siteIds?.length) {
    return baseUrl
  }

  const params = siteIds.map(id => `site_ids[]=${encodeURIComponent(String(id))}`).join('&')
  return baseUrl.includes('?') ? `${baseUrl}&${params}` : `${baseUrl}?${params}`
}

export function useReport(name: MaybeRefOrGetter<string>) {
  const { get, downloadBlob } = useApi()
  const { locale } = useI18n()
  const toast = useToast()
  const { t } = useI18n()

  const result = ref<ReportResult | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)
  const downloading = ref(false)

  async function fetchReport(filters: ReportFilters = {}) {
    pending.value = true
    error.value = null
    try {
      const reportName = toValue(name)
      let url = `/api/reports/${reportName}`
      url = withSiteIds(url, filters.site_ids)
      const res = await get<ReportResult>(url, buildQuery(filters))
      result.value = res.data
    } catch {
      error.value = t('pages.insights.loadError')
      result.value = null
    } finally {
      pending.value = false
    }
  }

  async function downloadCsv(filters: ReportFilters = {}) {
    if (!import.meta.client) {
      return
    }

    downloading.value = true
    try {
      const reportName = toValue(name)
      const localeParam = locale.value === 'es' ? 'es' : 'en'
      let url = `/api/reports/${reportName}?format=csv&locale=${localeParam}`
      url = withSiteIds(url, filters.site_ids)

      const query = buildQuery(filters)
      const qs = Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      if (qs) {
        url += `&${qs}`
      }

      const blob = await downloadBlob(url)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `${reportName}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.add({
        title: t('pages.insights.csvError'),
        color: 'error'
      })
    } finally {
      downloading.value = false
    }
  }

  return {
    result,
    pending,
    error,
    downloading,
    fetchReport,
    downloadCsv
  }
}

export const REPORT_CATALOG = [
  {
    name: 'rent-roll',
    titleKey: 'pages.insights.reports.rentRoll.title',
    descriptionKey: 'pages.insights.reports.rentRoll.description',
    to: '/insights/rent-roll'
  },
  {
    name: 'occupancy',
    titleKey: 'pages.insights.reports.occupancy.title',
    descriptionKey: 'pages.insights.reports.occupancy.description',
    to: '/insights/occupancy'
  },
  {
    name: 'ageing',
    titleKey: 'pages.insights.reports.ageing.title',
    descriptionKey: 'pages.insights.reports.ageing.description',
    to: '/insights/ageing'
  },
  {
    name: 'collections',
    titleKey: 'pages.insights.reports.collections.title',
    descriptionKey: 'pages.insights.reports.collections.description',
    to: '/insights/collections'
  },
  {
    name: 'deposit-liability',
    titleKey: 'pages.insights.reports.depositLiability.title',
    descriptionKey: 'pages.insights.reports.depositLiability.description',
    to: '/insights/deposit-liability'
  },
  {
    name: 'daily-close',
    titleKey: 'pages.insights.reports.dailyClose.title',
    descriptionKey: 'pages.insights.reports.dailyClose.description',
    to: '/insights/daily-close'
  },
  {
    name: 'demo',
    titleKey: 'pages.insights.reports.demo.title',
    descriptionKey: 'pages.insights.reports.demo.description',
    to: '/insights/demo'
  }
] as const
