import type { ApiDiscount, DiscountType } from '~/types/facility'
import type { ApiInvoice } from '~/types/invoice'
import type { ApiNote } from '~/types/note'
import type { ApiPayment } from '~/types/payment'

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
  site: { id: number, name: string } | null
  unit_class: { id: number, label: string, code: string | null } | null
}

export interface ApiContractItemInsurance {
  id: number
  name: string
  coverage: string
  currency: string
}

export interface ApiContractItemDiscount {
  id: number
  code: string | null
  label: string
  discount_type: DiscountType
  value: string
}

export interface ApiContractItem {
  id: number
  item_type: 'unit' | 'insurance'
  item_id: number
  rate: string
  discount_id: number | null
  base_rate: string | null
  discount_ends_at: string | null
  discount?: ApiContractItemDiscount | null
  item?: ApiContractItemUnit | ApiContractItemInsurance | null
}

export interface ApiContractContact {
  id: number
  name: string
}

export interface ApiContractBillingSummary {
  billed_through: string | null
  balance_owed: string
  unallocated_credit: string
  overdue_amount: string
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
  reservation?: { id: number, status: string } | null
  deal?: { id: number, status: string } | null
}

export interface ApiContractDetail extends ApiContract {
  notes?: Array<ApiNote>
  invoices?: Array<ApiInvoice>
  payments?: Array<ApiPayment>
  billing_summary?: ApiContractBillingSummary
}

export function contractUnitItem(contract: ApiContract): ApiContractItem | null {
  return contract.items?.find(i => i.item_type === 'unit') ?? null
}

export function contractInsuranceItem(contract: ApiContract): ApiContractItem | null {
  return contract.items?.find(i => i.item_type === 'insurance') ?? null
}

export interface ApiConvertPreviewContact {
  id: number
  name: string
}

export interface ApiConvertPreviewUnit {
  id: number
  unit_number: string
  site: { id: number, name: string } | null
  unit_class: { id: number, label: string, code: string } | null
}

export interface ApiConvertPreviewFirstPeriod {
  start_date: string
  end_date: string
  days: number
  unit_amount: string
  insurance_amount: string | null
  total: string
}

export interface ApiConvertPreview {
  contact: ApiConvertPreviewContact
  unit: ApiConvertPreviewUnit
  billing_period: string
  currency: string | null
  base_rate: string
  suggested_unit_rate: string
  unit_rate: string
  insurance_id: number | null
  insurance_rate: string | null
  discount: ApiDiscount | null
  discount_ends_at: string | null
  rate_overridden: boolean
  first_period: ApiConvertPreviewFirstPeriod
}
