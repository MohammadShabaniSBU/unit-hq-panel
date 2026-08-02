import type { ApiBillingPeriod } from '~/types/billing-period'
import type { ApiDiscount, DiscountType } from '~/types/facility'
import type { ApiNote } from '~/types/note'
import type { ApiPayment } from '~/types/payment'

export type ContractStatus =
  | 'awaiting_signature'
  | 'pending'
  | 'active'
  | 'notice_given'
  | 'ended'
  | 'cancelled'
export type ContractStatusFilter = ContractStatus | 'all'
export type ContractSignatureMode = 'immediate' | 'remote'
export type ContractAttentionFilter = 'declined' | 'post_cancellation' | null
export type ContractEndedReason =
  | 'vacated'
  | 'non_payment'
  | 'transferred_out'
  | 'operator_terminated'
  | 'cancelled'

export const CONTRACT_STATUSES: Array<ContractStatus> = [
  'awaiting_signature',
  'pending',
  'active',
  'notice_given',
  'ended',
  'cancelled'
]

export interface ContractsListMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  declined_count: number
  post_cancellation_count: number
}

export type BillingInterval = 'day' | 'week' | 'month'
export type BillingAnchorModel = 'anniversary' | 'calendar' | 'calendar_week'
export type ProrationMethod = 'daily' | 'full_period' | 'none'
export type ChargeType =
  | 'rent'
  | 'insurance'
  | 'deposit'
  | 'late_fee'
  | 'lien_fee'
  | 'other'
  | 'adjustment'
  | 'write_off'
  | 'refund'

export type MoveOutSettlement = 'none' | 'daily' | 'notice_based'
export type TransferBilling = 'prorate_immediately' | 'next_period'
export type TransferPricingMode = 'destination_rate' | 'retain_rate'
export type DepositSettlementOutcome = 'released' | 'deducted' | 'forfeited'
export type DepositPayoutStatus = 'pending' | 'paid' | 'not_applicable'

export interface ApiContractOccupancy {
  unit_id: number
  unit_number: string | null
  started_on: string
  ended_on: string | null
  ended_reason: string | null
}

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

export type ContractItemChangeReason = 'rate_change' | 'transfer' | 'correction'

export interface ApiContractItem {
  id: number
  item_type: 'unit' | 'insurance'
  item_id: number
  amount: string
  currency: string
  price_id: number
  discount_id: number | null
  base_rate: string | null
  discount_ends_at: string | null
  tax_rate_id: number | null
  tax_rate_snapshot: string | null
  declared_goods_value: string | null
  description: string | null
  effective_from: string
  effective_to: string | null
  supersedes_id: number | null
  change_reason: ContractItemChangeReason | null
  discount?: ApiContractItemDiscount | null
  tax_rate?: ApiContractItemTaxRate | null
  item?: ApiContractItemUnit | ApiContractItemInsurance | null
}

export interface ApiCharge {
  id: number
  contract_id: number
  contract_item_id: number | null
  billing_period_id: number | null
  charge_type: ChargeType
  period_start: string | null
  period_end: string | null
  net_amount: string
  tax_rate_snapshot: string | null
  tax_amount: string
  amount: string
  currency: string
  due_date: string
  description: string | null
  reversal_of_charge_id: number | null
  created_at: string
  allocated_amount?: string
  open_amount?: string
}

export interface ApiContractContact {
  id: number
  name: string
}

export interface ApiLastFailedBillingRun {
  billing_run_id: number
  detail: string | null
  error_message: string | null
}

export interface ApiContractBillingSummary {
  billed_through: string | null
  balance_owed: string
  unallocated_credit: string
  overdue_amount: string
  currency: string
  last_failed_billing_run?: ApiLastFailedBillingRun | null
}

export type AutopayAttemptStatus = 'pending' | 'succeeded' | 'failed'

export interface ApiAutopayAttemptSummary {
  id: number
  status: AutopayAttemptStatus
  amount?: string
  currency?: string
  failure_code: string | null
  decline_code: string | null
  failure_message: string | null
  triggered_by?: string
  attempted_at: string | null
  resolved_at?: string | null
}

export interface ApiContractAutopay {
  enabled: boolean
  payment_method_id: number | null
  payment_method: {
    id: number
    display_label: string
    type: string | null
    is_default: boolean
  } | null
  last_attempt: ApiAutopayAttemptSummary | null
  next_collection: {
    date: string | null
    amount: string | null
    currency: string | null
  } | null
}

export interface ApiContractOverlock {
  active: boolean
  pending_release: boolean
  delinquency_id: number | null
}

export interface ApiContractAccessSuspension {
  active: boolean
  pending_restore: boolean
  reason: string | null
  delinquency_id: number | null
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
  currency: string
  payment_method_id?: number | null
  autopay_enabled?: boolean
  autopay?: ApiContractAutopay
  status: ContractStatus
  overlock?: ApiContractOverlock
  access_suspension?: ApiContractAccessSuspension
  allowed_transitions?: Array<ContractStatus>
  can_transfer?: boolean
  notice_given_on?: string | null
  notice_period_days?: number | null
  scheduled_move_out_on?: string | null
  move_out_settlement?: MoveOutSettlement | null
  transfer_billing?: TransferBilling | null
  move_out_on?: string | null
  ended_reason?: ContractEndedReason | null
  deposit_settlement?: ApiDepositSettlement | null
  signed_at: string
  created_at: string
  updated_at: string
  items?: Array<ApiContractItem>
  item_history?: Array<ApiContractItem>
  occupancies?: Array<ApiContractOccupancy>
  charges?: Array<ApiCharge>
  contact?: ApiContractContact | null
  reservation?: { id: number, status: string } | null
  deal?: { id: number, status: string } | null
}

export interface ApiDepositSettlementLine {
  id: number
  charge_id: number
  amount: string
  currency: string
  reason: string
  created_at: string | null
}

export interface ApiDepositSettlement {
  id: number
  contract_id: number
  outcome: DepositSettlementOutcome
  deposit_amount: string
  refunded_amount: string
  currency: string
  payout_status: DepositPayoutStatus
  paid_at: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  lines?: Array<ApiDepositSettlementLine>
}

export interface VacateDepositDeduction {
  amount: string
  reason: string
  tax_rate_id?: number | null
}

export interface VacatePayload {
  move_out_on: string
  deposit: {
    outcome: DepositSettlementOutcome
    deductions?: Array<VacateDepositDeduction>
  }
}

export interface VacatePreviewItemLine {
  contract_item_id: number
  item_type: string
  charge_type: string
  period_start: string
  period_end: string
  days: number
  days_in_period: number
  net: string
  tax: string
  gross: string
  tax_rate_snapshot: string | null
  adjusts_charge_id: number | null
  description: string
}

export interface VacatePreviewDepositLine {
  kind: string
  charge_type: string
  net: string
  tax: string
  gross: string
  tax_rate_snapshot: string | null
  reason: string
  description: string
}

export interface InvoiceToIssuePreview {
  kind: string
  rectifies_full_number: string | null
  gross_total: string
  net_total: string
  tax_total: string
}

export interface VacatePreview {
  final_billing_date: string
  notice_derived_date: string
  move_out_on: string
  billed_through: string | null
  move_out_settlement: MoveOutSettlement
  item_lines: Array<VacatePreviewItemLine>
  deposit: {
    outcome: DepositSettlementOutcome
    deposit_amount: string
    refunded_amount: string
    payout_status: DepositPayoutStatus
    lines: Array<VacatePreviewDepositLine>
  }
  resulting_balance: string
  payout_amount: string
  currency: string
  invoices_to_issue?: Array<InvoiceToIssuePreview>
}

export interface TransferPayload {
  to_unit_id: number
  transfer_date: string
  pricing_mode?: TransferPricingMode
  reason?: string | null
}

export interface TransferPreviewChargeLine {
  contract_item_id: number | null
  charge_type: string
  period_start: string
  period_end: string
  days: number
  days_in_period: number
  net: string
  tax: string
  gross: string
  tax_rate_snapshot: string | null
  adjusts_charge_id: number | null
  description: string
}

export interface TransferPreview {
  pricing_mode: TransferPricingMode
  transfer_billing: TransferBilling
  transfer_date: string
  billed_through: string | null
  origin_item: {
    id: number
    price_id: number
    amount: string
    tax_rate_snapshot: string | null
  }
  destination_item: {
    price_id: number
    amount: string
    currency: string
    tax_rate_id: number | null
    tax_rate_snapshot: string | null
    item_id: number
  }
  credit: TransferPreviewChargeLine | null
  debit: TransferPreviewChargeLine | null
  deposit: {
    differential: string
    surplus: string
    new_deposit_amount: string
    charge: {
      charge_type: string
      net: string
      tax: string
      gross: string
      tax_rate_snapshot: string | null
      description: string
    } | null
  }
  resulting_balance: string
  currency: string
  invoices_to_issue?: Array<InvoiceToIssuePreview>
}

export interface ApiContractDetail extends ApiContract {
  notes?: Array<ApiNote>
  billing_periods?: Array<ApiBillingPeriod>
  payments?: Array<ApiPayment>
  billing_summary?: ApiContractBillingSummary
  item_history?: Array<ApiContractItem>
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
  invoice_kind: 'ordinary' | 'simplified' | 'rectificative'
  invoice_blocker: string | null
  net_total?: string
  tax_total?: string
  gross_total?: string
}
