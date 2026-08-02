import type { DashboardMeta, ReportFilters, ReportResult } from '~/types/report'

export function useDashboard() {
  const { get } = useApi()
  const { t } = useI18n()

  const meta = ref<DashboardMeta | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function fetchDashboard(filters: ReportFilters = {}) {
    pending.value = true
    error.value = null
    try {
      let url = '/api/reports/dashboard'
      if (filters.site_ids?.length) {
        const params = filters.site_ids
          .map(id => `site_ids[]=${encodeURIComponent(String(id))}`)
          .join('&')
        url += `?${params}`
      }
      const query: Record<string, string> = {}
      if (filters.as_of) {
        query.as_of = filters.as_of
      }
      const res = await get<ReportResult>(url, query)
      meta.value = (res.data.meta ?? null) as DashboardMeta | null
    } catch {
      error.value = t('pages.insights.dashboard.loadError')
      meta.value = null
    } finally {
      pending.value = false
    }
  }

  return {
    meta,
    pending,
    error,
    fetchDashboard
  }
}

export function dashboardDrillTo(
  path: string,
  filters: Record<string, string | number | Array<number>>
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(`${key}[]`, String(item))
      }
    } else if (value !== '' && value != null) {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}
