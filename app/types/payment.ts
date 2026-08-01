export type PaymentMethod = 'cash' | 'bank_transfer' | 'card_external'

export interface ApiPaymentContractSummary {
  id: number
  status: string
  currency?: string | null
  unit_number: string | null
}

export interface ApiPayment {
  id: number
  contract_id: number
  amount: string
  currency: string
  method: PaymentMethod | null
  received_on: string | null
  reference: string | null
  stripe_payment_intent_id: string | null
  reversal_of_payment_id: number | null
  created_at: string
  allocated_amount?: string
  contract?: ApiPaymentContractSummary | null
}

export interface PaymentAllocationInput {
  charge_id: number
  amount: string
}

export interface RecordPaymentPayload {
  amount: string
  method: PaymentMethod
  received_on: string
  reference?: string | null
  allocations?: Array<PaymentAllocationInput>
}
