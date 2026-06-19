export interface ApiOption {
  value: number
  label: string
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

export interface ApiUnit {
  id: number
  site_id: number
  unit_class_id: number
  unit_number: string
  enabled: boolean
  actual_width: string | null
  actual_depth: string | null
  actual_height: string | null
  note: string | null
  created_at: string
  updated_at: string
  site?: ApiSite
  unit_class?: ApiUnitClass
}

export interface ApiUnitClass {
  id: number
  code: string
  label: string
  size: string | null
  current_price_id: number | null
  created_at: string
  updated_at: string
}

export interface ApiUnitClassSitePrice {
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
