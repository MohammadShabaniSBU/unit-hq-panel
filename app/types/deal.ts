export type DealStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'offer_sent'
  | 'offer_viewed'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'unresponsive'

export type StayPeriod = 'day' | 'week' | 'month'

export type DealStatusFilter = DealStatus | 'all'

export const DEAL_STATUSES: Array<DealStatus> = [
  'new',
  'contacted',
  'qualified',
  'offer_sent',
  'offer_viewed',
  'negotiating',
  'closed_won',
  'closed_lost',
  'unresponsive'
]

export const STAY_PERIODS: Array<StayPeriod> = ['day', 'week', 'month']

export interface ApiDealContact {
  id: number
  name: string
}

export interface ApiDealUnitClass {
  id: number
  code: string
  label: string
  size: string | null
  current_price_id: number | null
  created_at: string
  updated_at: string
}

export interface ApiDeal {
  id: number
  contact_id: number
  status: DealStatus
  expected_value: string
  expected_move_in: string | null
  expected_stay_length: number | null
  expected_stay_period: StayPeriod | null
  storage_reason: string | null
  desired_size: string | null
  desired_unit_class_id: number | null
  intent_notes: string | null
  created_at: string
  updated_at: string
  contact?: ApiDealContact | null
  desired_unit_class?: ApiDealUnitClass | null
}
