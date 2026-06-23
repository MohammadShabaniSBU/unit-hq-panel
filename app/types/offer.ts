export type OfferStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'expired'

export type OfferStatusFilter = OfferStatus | 'all'

export const OFFER_STATUSES: Array<OfferStatus> = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'expired'
]

export interface ApiOfferContact {
  id: number
  name: string
}

export interface ApiOfferDeal {
  id: number
  contact_id: number
  status: string
  expected_move_in: string | null
  expected_stay_length: number | null
  expected_stay_period: string | null
  storage_reason: string | null
  desired_size: string | null
  desired_unit_class_id: number | null
  created_at: string
  updated_at: string
}

export interface ApiOfferOptionUnitClassRate {
  id: number
  unit_class?: { id: number; label: string } | null
  site?: { id: number; name: string } | null
  price?: { amount: string; currency: string; billing_period: string } | null
}

export interface ApiOfferOption {
  id: number
  offer_id: number
  unit_class_rate_id: number
  discount_id: number | null
  label: string
  description: string | null
  display_order: number
  selected_at: string | null
  created_at: string
  updated_at: string
  unit_class_rate?: ApiOfferOptionUnitClassRate | null
}

export interface ApiOffer {
  id: number
  deal_id: number
  contact_id: number
  token: string
  status: OfferStatus
  expires_at: string
  sent_at: string | null
  first_viewed_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
  options?: Array<ApiOfferOption>
  contact?: ApiOfferContact | null
  deal?: ApiOfferDeal | null
}
