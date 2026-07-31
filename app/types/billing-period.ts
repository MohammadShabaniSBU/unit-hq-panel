export type BillingPeriodStatus = 'draft' | 'issued' | 'paid' | 'void'

export interface ApiBillingPeriodContractSummary {
  id: number
  status: string
  currency?: string | null
  unit_number: string | null
}

export interface ApiBillingPeriod {
  id: number
  contract_id: number
  billing_period_start: string
  billing_period_end: string
  status: BillingPeriodStatus
  issued_at: string | null
  created_at: string
  currency?: string | null
  total?: string
  charges_count?: number
  contract?: ApiBillingPeriodContractSummary | null
}
