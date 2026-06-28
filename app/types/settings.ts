export interface ApiGeneralSettings {
  company_name: string
  company_contact_email: string
  phone: string
}

export interface ApiBillingSettings {
  default_currency: string
  default_billing_period: string
}

export interface ApiLeasingSettings {
  default_offer_expiration_value: number
  default_offer_expiration_unit: string
  default_reservation_expiration_value: number
  default_reservation_expiration_unit: string
}
