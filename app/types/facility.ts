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

export interface ApiSite {
  id: number
  name: string
  address: string | null
  city: string | null
  country_id: number | null
  country: ApiCountry | null
  contact_email: string | null
  contact_phone: string | null
  location: { lat: number; lng: number } | null
  created_at: string
  updated_at: string
}

export interface ApiSiteMap {
  id: number
  site_id: number
  floor_name: string
  sort_order: number
  svg_map?: string
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
  status?: UnitMapStatus
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
  status: UnitMapStatus | 'unknown'
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
