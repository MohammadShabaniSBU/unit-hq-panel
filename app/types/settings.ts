import type { BillingAnchorModel, BillingInterval, ProrationMethod } from '~/types/contract'

export interface ApiGeneralSettings {
  company_name: string
  company_contact_email: string
  phone: string
}

export interface ApiBillingSettings {
  default_currency: string
  default_billing_interval: BillingInterval
  default_billing_interval_count: number
  billing_anchor_model: BillingAnchorModel
  billing_anchor_day: number
  proration_method: ProrationMethod
  default_deposit_amount: string
}

export interface ApiLeasingSettings {
  default_offer_expiration_value: number
  default_offer_expiration_unit: string
  default_reservation_expiration_value: number
  default_reservation_expiration_unit: string
}

export type { ApiActivityLogSettings } from '~/types/activity'
