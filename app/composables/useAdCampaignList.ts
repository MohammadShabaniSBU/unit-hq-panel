import type { ApiMeta } from '~/types/facility'
import type { AdCampaign, AdCampaignMapping } from '~/types/advertising'

const emptyMeta = (perPage = 15): ApiMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: perPage,
  total: 0
})

export interface AdCampaignQuery {
  page: number
  perPage: number
  provider?: string
  status?: string
  mapped?: 'true' | 'false'
  siteId?: number
  from?: string
  to?: string
}

export function useAdCampaignList() {
  const { getPaginated, put, post } = useApi()
  const campaigns = ref<Array<AdCampaign>>([])
  const meta = ref<ApiMeta>(emptyMeta())
  const pending = ref(false)
  const error = ref(false)

  async function fetchPage(query: AdCampaignQuery) {
    pending.value = true
    error.value = false
    const params: Record<string, string | number> = {
      page: query.page,
      per_page: query.perPage
    }
    if (query.provider) {
      params.provider = query.provider
    }
    if (query.status) {
      params.status = query.status
    }
    if (query.mapped) {
      params.mapped = query.mapped
    }
    if (query.siteId != null) {
      params.site_id = query.siteId
    }
    if (query.from && query.to) {
      params.from = query.from
      params.to = query.to
    }

    try {
      const response = await getPaginated<AdCampaign>('/api/ad-campaigns', params)
      campaigns.value = response.data
      meta.value = response.meta
    } catch {
      error.value = true
      campaigns.value = []
      meta.value = emptyMeta(query.perPage)
    } finally {
      pending.value = false
    }
  }

  async function mapCampaign(id: number, body: AdCampaignMapping) {
    const response = await put<AdCampaign>(`/api/ad-campaigns/${id}/mapping`, {
      site_id: body.site_id,
      unit_class_id: body.unit_class_id ?? null,
      utm_campaign_hint: body.utm_campaign_hint ?? null
    })
    return response.data
  }

  async function mapSelected(ids: Array<number>, siteId: number) {
    const response = await post<Array<AdCampaign>>('/api/ad-campaigns/mapping/bulk', {
      ids,
      site_id: siteId
    })
    return response.data
  }

  return {
    campaigns,
    meta,
    pending,
    error,
    fetchPage,
    mapCampaign,
    mapSelected
  }
}
