export type ContractStatus = 'active' | 'moved_out' | 'terminated' | 'expired'
export type ContractStatusFilter = ContractStatus | 'all'

export const CONTRACT_STATUSES: Array<ContractStatus> = [
  'active',
  'moved_out',
  'terminated',
  'expired'
]

export interface ApiContractItemUnit {
  id: number
  unit_number: string
  site: { id: number; name: string } | null
  unit_class: { id: number; label: string; code: string } | null
}

export interface ApiContractItemInsurance {
  id: number
  name: string
  coverage: string
  currency: string
}

export interface ApiContractItem {
  id: number
  item_type: 'unit' | 'insurance'
  item_id: number
  rate: string
  item?: ApiContractItemUnit | ApiContractItemInsurance | null
}

export interface ApiContractContact {
  id: number
  name: string
}

export interface ApiContract {
  id: number
  contact_id: number
  reservation_id: number | null
  deal_id: number | null
  start_date: string
  end_date: string | null
  status: ContractStatus
  signed_at: string
  created_at: string
  updated_at: string
  items?: Array<ApiContractItem>
  contact?: ApiContractContact | null
  reservation?: { id: number; status: string } | null
  deal?: { id: number; status: string } | null
}

export function contractUnitItem(contract: ApiContract): ApiContractItem | null {
  return contract.items?.find(i => i.item_type === 'unit') ?? null
}

export function contractInsuranceItem(contract: ApiContract): ApiContractItem | null {
  return contract.items?.find(i => i.item_type === 'insurance') ?? null
}
