export type TaxIdType = 'nif' | 'nie' | 'siren' | 'siret' | 'uk_crn' | 'vat' | 'other'
export type FiscalRegime = 'none' | 'verifactu' | 'no_verificable' | 'ticketbai' | 'sii'

export interface ApiLegalEntity {
  id: number
  legal_name: string
  trading_name: string | null
  tax_id: string
  tax_id_type: TaxIdType
  vat_number: string | null
  country_code: string
  address_line1: string
  address_line2: string | null
  city: string
  postal_code: string
  fiscal_regime: FiscalRegime
  sepa_creditor_id: string | null
  sites_count?: number
  archived_at: string | null
  created_at: string
  updated_at: string
}
