import type { ApiOption } from '~/types/facility'
import type { ApiSiteStripeSetting } from '~/types/stripe'

export interface SiteStripeOverviewRow {
  id: number
  name: string
  status: ApiSiteStripeSetting['status']
}

export function useSitesStripeOverview() {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'settings-payments-sites-overview',
    async (): Promise<Array<SiteStripeOverviewRow>> => {
      const sites = await get<Array<ApiOption>>('/api/sites/options')

      const rows = await Promise.all(sites.data.map(async (site): Promise<SiteStripeOverviewRow> => {
        try {
          const setting = await get<ApiSiteStripeSetting>(`/api/sites/${site.value}/stripe-settings`)
          return { id: site.value, name: site.label, status: setting.data.status }
        } catch {
          return { id: site.value, name: site.label, status: 'disconnected' }
        }
      }))

      return rows
    }
  )

  const rows = computed(() => data.value ?? [])

  return {
    rows,
    pending,
    error,
    refresh
  }
}
