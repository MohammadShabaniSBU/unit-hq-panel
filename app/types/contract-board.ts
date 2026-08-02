import type { ContractStatus } from '~/types/contract'

export interface ContractCardContact {
  id: number
  name: string
}

export interface ContractCardUnitSite {
  id: number
  name: string
}

export interface ContractCardUnit {
  id: number
  unit_number: string
  site: ContractCardUnitSite | null
}

export type ContractCardEnvelopeStatus = 'sent' | 'viewed'

export interface ContractCardEnvelope {
  status: ContractCardEnvelopeStatus | string
  sent_at: string | null
  viewed_at: string | null
  expires_at: string | null
  expiring_soon: boolean
}

export interface ContractCard {
  id: number
  contact_id: number
  deal_id: number | null
  reservation_id: number | null
  status: ContractStatus
  start_date: string
  end_date: string | null
  signed_at: string | null
  updated_at: string
  envelope: ContractCardEnvelope | null
  contact?: ContractCardContact | null
  unit?: ContractCardUnit | null
}

export interface ContractBoardColumn {
  status: ContractStatus
  total: number
  cards: Array<ContractCard>
  next_cursor: string | null
  has_more: boolean
}

export interface ContractBoard {
  columns: Array<ContractBoardColumn>
}
