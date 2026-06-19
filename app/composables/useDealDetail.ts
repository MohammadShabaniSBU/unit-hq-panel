import type { ApiDeal } from '~/types/deal'
import type { ApiOffer } from '~/types/offer'
import type { ApiReservation } from '~/types/reservation'
import type { ApiContract } from '~/types/contract'
import type { ApiTask, ApiComment } from '~/composables/useContactDetail'

export interface ApiDealDetail extends ApiDeal {
  offers?: Array<ApiOffer>
  reservations?: Array<ApiReservation>
  contracts?: Array<ApiContract>
  tasks?: Array<ApiTask>
  comments?: Array<ApiComment>
}

export function useDealDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `deal:${id}`,
    () => get<ApiDealDetail>(`/api/deals/${id}`)
  )

  const deal = computed(() => data.value?.data ?? null)

  const activeOffers = computed(() =>
    deal.value?.offers?.filter(o => o.status !== 'expired') ?? []
  )

  const pendingTasks = computed(() =>
    deal.value?.tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled') ?? []
  )

  return {
    deal,
    activeOffers,
    pendingTasks,
    pending,
    error,
    refresh
  }
}
