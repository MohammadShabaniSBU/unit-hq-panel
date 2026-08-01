export type PaymentRequestStatus = 'pending' | 'processing' | 'paid' | 'cancelled'

export interface ApiPaymentRequest {
  id: number
  token: string
  url: string
  contract_id: number
  payment_provider_account_id: number
  charge_ids: Array<number>
  amount: string
  currency: string
  status: PaymentRequestStatus
  expired: boolean
  expires_at: string
  stripe_payment_intent_id: string | null
  save_card_requested: boolean
  paid_payment_id: number | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface ApiPublicPaymentLine {
  charge_type: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  open_amount: string
  currency: string
}

export interface ApiPublicPaymentRequest {
  status: PaymentRequestStatus
  expired: boolean
  amount: string
  currency: string
  amount_mismatch: boolean
  current_open_total: string
  expires_at: string | null
  save_card_requested: boolean
  publishable_key: string | null
  entity_name: string | null
  contact_first_name: string | null
  lines: Array<ApiPublicPaymentLine>
}

export interface ApiPaymentIntent {
  client_secret: string
  payment_intent_id: string
  publishable_key: string | null
}

export interface CreatePaymentRequestPayload {
  charge_ids?: Array<number>
  save_card?: boolean
}
