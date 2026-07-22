import type { DealStatus } from '~/types/deal'

export interface DealCardContact {
  id: number
  name: string
  email: string | null
}

export interface DealCardUnitClass {
  id: number
  label: string
}

export interface DealCard {
  id: number
  status: DealStatus
  expected_move_in: string | null
  updated_at: string
  contact?: DealCardContact | null
  desired_unit_class?: DealCardUnitClass | null
}

export interface DealBoardColumn {
  status: DealStatus
  total: number
  cards: Array<DealCard>
  next_cursor: string | null
  has_more: boolean
}

export interface DealBoard {
  columns: Array<DealBoardColumn>
}
