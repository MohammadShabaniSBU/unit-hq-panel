export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void'

export interface ApiInvoiceContractSummary {
  id: number
  status: string
  unit_number: string | null
}

export interface ApiInvoice {
  id: number
  contract_id: number
  billing_period_start: string
  billing_period_end: string
  status: InvoiceStatus
  issued_at: string | null
  created_at: string
  total?: string
  charges_count?: number
  contract?: ApiInvoiceContractSummary | null
}
