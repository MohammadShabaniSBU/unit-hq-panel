import type { ApiMeta } from '~/types/facility'
import type { AdConversionDelivery, AdDeliverySummaryRow } from '~/types/advertising'

const emptyMeta = (perPage = 15): ApiMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: perPage,
  total: 0
})

export interface AdDeliveryQuery {
  page: number
  perPage: number
  accountId?: number
  status?: string
  skipReason?: string
  eventKey?: string
  from?: string
  to?: string
}

export function useAdConversionDeliveryList() {
  const { get, getPaginated, post } = useApi()
  const rows = ref<Array<AdConversionDelivery>>([])
  const summary = ref<Array<AdDeliverySummaryRow>>([])
  const meta = ref<ApiMeta>(emptyMeta())
  const pending = ref(false)
  const error = ref(false)

  function params(query: AdDeliveryQuery): Record<string, string | number> {
    const built: Record<string, string | number> = {}
    if (query.accountId != null) {
      built.account = query.accountId
    }
    if (query.status) {
      built.status = query.status
    }
    if (query.skipReason) {
      built.skip_reason = query.skipReason
    }
    if (query.eventKey) {
      built.event_key = query.eventKey
    }
    if (query.from) {
      built.from = query.from
    }
    if (query.to) {
      built.to = query.to
    }
    return built
  }

  async function fetchPage(query: AdDeliveryQuery) {
    pending.value = true
    error.value = false
    try {
      const [list, totals] = await Promise.all([
        getPaginated<AdConversionDelivery>('/api/ad-conversion-deliveries', {
          ...params(query),
          page: query.page,
          per_page: query.perPage
        }),
        get<Array<AdDeliverySummaryRow>>('/api/ad-conversion-deliveries/summary', params(query))
      ])
      rows.value = list.data
      meta.value = list.meta
      summary.value = totals.data
    } catch {
      error.value = true
      rows.value = []
      summary.value = []
      meta.value = emptyMeta(query.perPage)
    } finally {
      pending.value = false
    }
  }

  async function retry(id: number) {
    const response = await post<AdConversionDelivery>(`/api/ad-conversion-deliveries/${id}/retry`, {})
    return response.data
  }

  return {
    rows,
    summary,
    meta,
    pending,
    error,
    fetchPage,
    retry
  }
}
