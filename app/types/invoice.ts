export type InvoiceKind = 'ordinary' | 'simplified' | 'rectificative'
export type InvoiceStatus = 'draft' | 'issued'
export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface ApiInvoiceAddress {
  line1?: string | null
  line2?: string | null
  city?: string | null
  postal?: string | null
  country?: string | null
}

export interface ApiInvoiceLine {
  id: number
  invoice_id: number
  charge_id: number
  description: string
  period_start: string | null
  period_end: string | null
  net_amount: string
  tax_rate_snapshot: string
  tax_amount: string
  gross_amount: string
  created_at: string | null
}

export type RectificationReason =
  | 'vacate_settlement'
  | 'transfer_credit'
  | 'operator_correction'

export interface ApiInvoiceLink {
  id: number
  full_number: string
  kind: InvoiceKind
  gross_total: string
}

export interface ApiInvoice {
  id: number
  legal_entity_id: number
  invoice_series_id: number
  number: number
  full_number: string
  kind: InvoiceKind
  status: InvoiceStatus
  issue_date: string | null
  contract_id: number | null
  contact_id: number
  rectifies_invoice_id: number | null
  rectification_reason: string | null
  issuer_name: string
  issuer_tax_id: string
  issuer_address: ApiInvoiceAddress
  buyer_name: string | null
  buyer_tax_id: string | null
  buyer_address: ApiInvoiceAddress | null
  currency: string
  net_total: string
  tax_total: string
  gross_total: string
  paid_amount?: string
  outstanding_amount?: string
  payment_status?: InvoicePaymentStatus
  created_by: number | null
  created_at: string | null
  updated_at: string | null
  contact?: {
    id: number
    name: string
  } | null
  contract?: {
    id: number
  } | null
  rectifies_invoice?: ApiInvoiceLink | null
  rectificatives?: Array<ApiInvoiceLink>
  lines?: Array<ApiInvoiceLine>
}
