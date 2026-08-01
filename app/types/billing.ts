export type BillingRunTrigger = 'scheduled' | 'manual' | 'retry'

export type BillingRunItemOutcome = 'billed' | 'skipped' | 'failed'

export interface ApiBillingRunCurrencyTotal {
  currency: string
  amount: string
}

export interface ApiBillingRunCreatedBy {
  id: number
  name: string
}

export interface ApiBillingRunContractSummary {
  id: number
  contact_id: number
  contact_name: string | null
  unit_number: string | null
}

export interface ApiBillingRunItem {
  id: number
  billing_run_id: number
  contract_id: number
  outcome: BillingRunItemOutcome
  periods_billed: number
  detail: string | null
  error_message: string | null
  invoice_ids: Array<number>
  amount_total: string | null
  currency: string | null
  contract: ApiBillingRunContractSummary | null
  created_at: string
}

export interface ApiBillingRun {
  id: number
  started_at: string
  finished_at: string | null
  duration_seconds: number | null
  trigger: BillingRunTrigger
  horizon_date: string
  contracts_considered: number
  contracts_billed: number
  contracts_skipped: number
  contracts_failed: number
  created_by?: ApiBillingRunCreatedBy | null
  totals_by_currency: Array<ApiBillingRunCurrencyTotal>
  items?: Array<ApiBillingRunItem>
  created_at: string
}

export interface ApiBillingRunPreviewRow {
  contract_id: number
  periods: number
  window_start: string | null
  window_end: string | null
  est_amount: string
}

export interface ApiNextBill {
  window: {
    start: string
    end: string
  }
  amount: string
  currency: string
}
