import type { OfferStatus } from '~/types/offer'

export interface OfferCardContact {
  id: number
  name: string
}

export interface OfferCard {
  id: number
  deal_id: number
  contact_id: number
  status: OfferStatus
  expires_at: string
  sent_at: string | null
  updated_at: string
  options_count?: number
  contact?: OfferCardContact | null
}

export interface OfferBoardColumn {
  status: OfferStatus
  total: number
  cards: Array<OfferCard>
  next_cursor: string | null
  has_more: boolean
}

export interface OfferBoard {
  columns: Array<OfferBoardColumn>
}
