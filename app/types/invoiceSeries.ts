export type InvoiceSeriesKind = 'ordinary' | 'simplified' | 'rectificative'

export interface ApiInvoiceSeries {
  id: number
  legal_entity_id: number
  code: string
  kind: InvoiceSeriesKind
  next_number: number
  is_default: boolean
  issued_count: number
  archived_at: string | null
  created_at: string
  updated_at: string
}
