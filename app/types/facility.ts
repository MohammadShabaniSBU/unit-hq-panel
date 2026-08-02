import type { ApiUnitAccess } from '~/types/access'
import type {
  ApiUnitCurrentHold,
  ApiUnitCurrentOccupancy,
  ApiUnitOverlock,
  UnitState
} from '~/types/unit'

export interface ApiOption {
  value: number
  label: string
}

export interface ApiUnitOption extends ApiOption {
  site_id: number | null
  price_amount: string | null
  price_currency: string | null
}

export interface ApiInsuranceOption extends ApiOption {
  rate: string | null
}

export interface ApiInsurancePlan {
  id: number
  name: string
  description: string | null
  coverage: string
  currency: string
  tax_rate_code: string | null
  created_at: string
  updated_at: string
}

export type DiscountType = 'percentage' | 'fixed_amount'

export interface ApiDiscount {
  id: number
  code: string | null
  label: string
  discount_type: DiscountType
  value: string
  duration_months: number | null
  effective_from: string | null
  effective_to: string | null
  created_at: string
}

export interface ApiInsuranceRateMatrixSite {
  id: number
  name: string
}

export interface ApiInsuranceRateMatrixCell {
  amount: string
  currency: string
  billing_period: string
}

export interface ApiInsuranceRateMatrixRow {
  insurance_id: number
  name: string
  rates: Record<string, ApiInsuranceRateMatrixCell | null>
}

export interface ApiInsuranceRateMatrix {
  sites: Array<ApiInsuranceRateMatrixSite>
  rows: Array<ApiInsuranceRateMatrixRow>
}

export interface ApiInsuranceSiteRate {
  insurance_rate_id: number | null
  site_id: number
  site_name: string
  price_id: number | null
  amount: string | null
  currency: string | null
  billing_period: string | null
}

export interface ApiCountry {
  id: number
  code: string
  name: string
}

export interface ApiSiteLegalEntity {
  id: number
  legal_name: string
}

export interface ApiSite {
  id: number
  name: string
  code: string | null
  address: string | null
  address_line_2: string | null
  city: string | null
  postal_code: string | null
  state_region: string | null
  country_id: number | null
  country: ApiCountry | null
  contact_email: string | null
  contact_phone: string | null
  location: { lat: number, lng: number } | null
  timezone: string
  currency: string | null
  legal_entity_id: number
  legal_entity?: ApiSiteLegalEntity | null
  delinquency_policy_id: number | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiSiteMapIdMatch {
  matched: Array<string>
  orphan_shapes: Array<string>
  uncovered_units: Array<string>
}

export interface ApiSiteMap {
  id: number
  site_id: number
  floor_name: string
  sort_order: number
  svg_map?: string
  id_match?: ApiSiteMapIdMatch
  created_at: string
  updated_at: string
}

export type UnitMapStatus = 'free' | 'occupied' | 'reserved' | 'archived'

export interface ApiUnit {
  id: number
  site_id: number
  unit_class_id: number
  unit_number: string
  enabled: boolean
  /** @deprecated Prefer `state` — legacy map bridge only. */
  status?: UnitMapStatus
  state?: UnitState | null
  current_occupancy_id?: number | null
  current_hold_id?: number | null
  current_occupancy?: ApiUnitCurrentOccupancy | null
  current_hold?: ApiUnitCurrentHold | null
  overlock?: ApiUnitOverlock | null
  access?: ApiUnitAccess | null
  tenant_name?: string | null
  contract_id?: number | null
  amount?: string | null
  currency?: string | null
  actual_width: string | null
  actual_depth: string | null
  actual_height: string | null
  note: string | null
  created_at: string
  updated_at: string
  site?: ApiSite
  unit_class?: ApiUnitClass
}

export interface UnitMapHoverDetails {
  unitNumber: string
  unitClass: string
  dimensions: string
  price: string
  state: UnitState | 'unknown'
  tenantName?: string | null
  contractStartedOn?: string | null
  rentAmount?: string | null
  rentCurrency?: string | null
  holdType?: string | null
  holdEndsOn?: string | null
}

export interface ApiUnitClass {
  id: number
  code: string
  label: string
  size: string | null
  current_price_id: number | null
  tax_rate_code: string | null
  created_at: string
  updated_at: string
}

export interface ApiUnitClassSitePrice {
  unit_class_rate_id: number | null
  site_id: number
  site_name: string
  price_id: number | null
  amount: string | null
  currency: string | null
  billing_period: string | null
}

export interface ApiUnitClassPriceMatrixSite {
  id: number
  name: string
  currency?: string | null
}

export interface ApiUnitClassPriceMatrixCell {
  amount: string
  currency: string
  billing_period: string
}

export interface ApiUnitClassPriceMatrixRow {
  unit_class_id: number
  code: string
  label: string
  prices: Record<string, ApiUnitClassPriceMatrixCell | null>
}

export interface ApiUnitClassPriceMatrix {
  sites: Array<ApiUnitClassPriceMatrixSite>
  rows: Array<ApiUnitClassPriceMatrixRow>
}

export interface ApiUnitClassOccupancyMatrixCell {
  occupied: number
  total: number
  percentage: number
}

export interface ApiUnitClassOccupancyMatrixRow {
  unit_class_id: number
  code: string
  label: string
  occupancy: Record<string, ApiUnitClassOccupancyMatrixCell | null>
}

export interface ApiUnitClassOccupancyMatrix {
  sites: Array<ApiUnitClassPriceMatrixSite>
  rows: Array<ApiUnitClassOccupancyMatrixRow>
}

export interface ApiMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiResponse<T> {
  message: string
  data: T
}

export interface ApiPaginatedResponse<T> {
  message: string
  data: T[]
  meta: ApiMeta
}
