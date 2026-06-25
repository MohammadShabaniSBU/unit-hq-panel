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

export type StorageReason =
  | 'freelancer'
  | 'business_extra_space'
  | 'startup'
  | 'other_business_need'
  | 'other_personal_use'
  | 'new_home'
  | 'house_renovations'
  | 'travelling'
  | 'decluttering'
  | 'charity_non_profit'
  | 'other'
  | 'personal'
  | 'business'
  | 'student'

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

export const STORAGE_REASONS: Array<StorageReason> = [
  'freelancer',
  'business_extra_space',
  'startup',
  'other_business_need',
  'other_personal_use',
  'new_home',
  'house_renovations',
  'travelling',
  'decluttering',
  'charity_non_profit',
  'other',
  'personal',
  'business',
  'student'
]

export interface ApiDealContact {
  id: number
  name: string
  email?: string | null
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
  site_id: number | null
  status: DealStatus
  expected_move_in: string | null
  expected_stay_length: number | null
  expected_stay_period: StayPeriod | null
  storage_reason: StorageReason | null
  desired_size: string | null
  desired_unit_class_id: number | null
  created_at: string
  updated_at: string
  contact?: ApiDealContact | null
  desired_unit_class?: ApiDealUnitClass | null
}
