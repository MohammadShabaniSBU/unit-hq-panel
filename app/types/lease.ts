export type LeaseStatus = 'active' | 'moved_out' | 'terminated' | 'expired'
export type LeaseStatusFilter = LeaseStatus | 'all'

export const LEASE_STATUSES: Array<LeaseStatus> = [
  'active',
  'moved_out',
  'terminated',
  'expired'
]

export interface ApiLeaseUnit {
  id: number
  unit_number: string
  site: { id: number; name: string } | null
  unit_class: { id: number; label: string; code: string } | null
}

export interface ApiLeaseContact {
  id: number
  name: string
}

export interface ApiLease {
  id: number
  unit_id: number
  contact_id: number
  reservation_id: number | null
  deal_id: number | null
  start_date: string
  end_date: string | null
  actual_rate: string
  actual_insurance: string | null
  status: LeaseStatus
  signed_at: string
  created_at: string
  updated_at: string
  unit?: ApiLeaseUnit | null
  contact?: ApiLeaseContact | null
  reservation?: { id: number; status: string } | null
}
