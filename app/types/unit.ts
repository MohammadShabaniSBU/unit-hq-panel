export type UnitState
  = | 'available'
    | 'occupied'
    | 'reserved'
    | 'maintenance'
    | 'damaged'
    | 'staff_use'
    | 'other'

export type UnitStateFilter
  = | 'all'
    | 'available'
    | 'occupied'
    | 'reserved'
    | 'out_of_service'

export type HoldType
  = | 'reservation'
    | 'maintenance'
    | 'damaged'
    | 'staff_use'
    | 'overlock'
    | 'other'

export type ManualHoldType = 'maintenance' | 'damaged' | 'staff_use' | 'other'

export const UNIT_STATES: Array<UnitState> = [
  'available',
  'occupied',
  'reserved',
  'maintenance',
  'damaged',
  'staff_use',
  'other'
]

export const UNIT_STATE_FILTERS: Array<UnitStateFilter> = [
  'all',
  'available',
  'occupied',
  'reserved',
  'out_of_service'
]

export const MANUAL_HOLD_TYPES: Array<ManualHoldType> = [
  'maintenance',
  'damaged',
  'staff_use',
  'other'
]

export interface ApiUnitCurrentOccupancy {
  contract_id: number
  started_on: string
}

export interface ApiUnitCurrentHold {
  id: number
  hold_type: HoldType
  starts_on: string
  ends_on: string | null
  reason: string | null
  created_by: number | null
}

/** Occupied-unit decoration — never a UnitState. */
export interface ApiUnitOverlock {
  active: true
  unit_hold_id: number
  delinquency_id: number | null
  starts_on: string | null
}

export interface ApiUnitHold {
  id: number
  unit_id: number
  hold_type: HoldType
  reservation_id: number | null
  starts_on: string
  ends_on: string | null
  released_at: string | null
  reason: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface ApiUnitOccupancy {
  id: number
  unit_id: number
  contract_id: number
  started_on: string
  ended_on: string | null
  ended_reason: string | null
  tenant_name: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface UnitStateTabCounts {
  all: number
  available: number
  occupied: number
  reserved: number
  out_of_service: number
}

export interface PlaceUnitHoldPayload {
  hold_type: ManualHoldType
  starts_on?: string
  ends_on?: string | null
  reason: string
}
