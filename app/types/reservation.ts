export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired'
export type ReservationStatusFilter = ReservationStatus | 'all'

export const RESERVATION_STATUSES: Array<ReservationStatus> = [
  'pending',
  'confirmed',
  'cancelled',
  'expired'
]

export interface ApiReservationUnit {
  id: number
  unit_number: string
  site: { id: number; name: string } | null
  unit_class: { id: number; label: string; code: string } | null
}

export interface ApiReservationContact {
  id: number
  name: string
}

export interface ApiReservationPrice {
  amount: string
  currency: string
  billing_period: string
}

export interface ApiReservation {
  id: number
  unit_id: number
  contact_id: number
  price_id: number | null
  deal_id: number | null
  offer_option_id: number | null
  status: ReservationStatus
  expires_at: string
  created_at: string
  updated_at: string
  unit?: ApiReservationUnit | null
  contact?: ApiReservationContact | null
  price?: ApiReservationPrice | null
  contract?: { id: number; status: string } | null
}
