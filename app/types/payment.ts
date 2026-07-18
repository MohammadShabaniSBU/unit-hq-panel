export interface ApiPaymentContractSummary {
  id: number
  status: string
  unit_number: string | null
}

export interface ApiPayment {
  id: number
  contract_id: number
  amount: string
  stripe_payment_intent_id: string | null
  reversal_of_payment_id: number | null
  created_at: string
  allocated_amount?: string
  contract?: ApiPaymentContractSummary | null
}
