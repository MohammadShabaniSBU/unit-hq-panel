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

export type BillingInterval = 'day' | 'week' | 'month'
export type BillingAnchorModel = 'anniversary' | 'calendar'
export type ProrationMethod = 'daily' | 'full_period' | 'none'
export type ChargeType = 'rent' | 'insurance' | 'deposit' | 'late_fee' | 'lien_fee' | 'other'

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

export interface ApiContractItemTaxRate {
  id: number
  name: string
  code: string
  rate: string
}

export interface ApiContractItem {
  id: number
  item_type: 'unit' | 'insurance'
  item_id: number
  amount: string
  price_id: number | null
  discount_id: number | null
  base_rate: string | null
  discount_ends_at: string | null
  tax_rate_id: number | null
  tax_rate_snapshot: string | null
  declared_goods_value: string | null
  description: string | null
  discount?: ApiContractItemDiscount | null
  tax_rate?: ApiContractItemTaxRate | null
  item?: ApiContractItemUnit | ApiContractItemInsurance | null
}

export interface ApiCharge {
  id: number
  contract_id: number
  contract_item_id: number | null
  invoice_id: number | null
  charge_type: ChargeType
  period_start: string | null
  period_end: string | null
  net_amount: string
  tax_rate_snapshot: string | null
  tax_amount: string
  amount: string
  due_date: string
  description: string | null
  reversal_of_charge_id: number | null
  created_at: string
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
  billing_interval: BillingInterval
  billing_interval_count: number
  billing_anchor_model: BillingAnchorModel
  billing_anchor_date: string | null
  billed_through: string | null
  proration_method: ProrationMethod
  move_in_date: string | null
  deposit_amount: string
  status: ContractStatus
  signed_at: string
  created_at: string
  updated_at: string
  items?: Array<ApiContractItem>
  charges?: Array<ApiCharge>
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

export interface ApiConvertPreviewChargeLine {
  net: string
  tax: string
  gross: string
}

export interface ApiConvertPreviewFirstPeriod {
  start_date: string
  end_date: string
  has_stub: boolean
  skipped: boolean
  days_occupied: number | null
  days_in_period: number | null
  unit: ApiConvertPreviewChargeLine | null
  insurance: ApiConvertPreviewChargeLine | null
  total_net: string
  total_tax: string
  total_gross: string
}

export interface ApiConvertPreview {
  contact: ApiConvertPreviewContact
  unit: ApiConvertPreviewUnit
  billing_interval: BillingInterval
  billing_interval_count: number
  billing_anchor_model: BillingAnchorModel
  currency: string | null
  base_rate: string
  suggested_unit_rate: string
  unit_rate: string
  unit_tax_rate: ApiContractItemTaxRate | null
  insurance_id: number | null
  insurance_rate: string | null
  insurance_tax_rate: ApiContractItemTaxRate | null
  deposit_amount: string
  move_in_date: string
  discount: ApiDiscount | null
  discount_ends_at: string | null
  rate_overridden: boolean
  first_period: ApiConvertPreviewFirstPeriod
}
