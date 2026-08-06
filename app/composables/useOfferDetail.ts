import type { ApiOffer } from '~/types/offer'
import type { ApiNote } from '~/types/note'

export interface ApiOfferDetail extends ApiOffer {
  deal?: ApiOfferDeal | null
  notes?: Array<ApiNote>
}

export interface ApiOfferDeal {
  id: number
  contact_id: number
  status: string
  expected_move_in: string | null
  expected_stay_length: number | null
  expected_stay_period: string | null
  desired_size: string | null
  desired_unit_class_id: number | null
  created_at: string
  updated_at: string
}

export function useOfferDetail(id: string | number) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    `offer:${id}`,
    () => get<ApiOfferDetail>(`/api/offers/${id}`)
  )

  const offer = computed(() => data.value?.data ?? null)

  return {
    offer,
    pending,
    error,
    refresh
  }
}
