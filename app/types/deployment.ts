export interface ApiDeployment {
  country: string
  currency: string
  default_locale: string
  allowed_timezones: Array<string>
  tax_subdivisions: Array<string>
  payment_rails: Array<string>
  fiscal_regime: string
}
