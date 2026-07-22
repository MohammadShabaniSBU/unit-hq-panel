import type { ReservationStatus } from '~/types/reservation'

export interface ReservationCardContact {
  id: number
  name: string
}

export interface ReservationCardUnitSite {
  id: number
  name: string
}

export interface ReservationCardUnit {
  id: number
  unit_number: string
  site: ReservationCardUnitSite | null
}

export interface ReservationCard {
  id: number
  contact_id: number
  unit_id: number
  deal_id: number | null
  status: ReservationStatus
  expires_at: string
  updated_at: string
  contact?: ReservationCardContact | null
  unit?: ReservationCardUnit | null
}

export interface ReservationBoardColumn {
  status: ReservationStatus
  total: number
  cards: Array<ReservationCard>
  next_cursor: string | null
  has_more: boolean
}

export interface ReservationBoard {
  columns: Array<ReservationBoardColumn>
}
