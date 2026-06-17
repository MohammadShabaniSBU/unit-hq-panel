export interface ApiOption {
  value: number
  title: string
}

export interface ApiSite {
  id: number
  name: string
  address: string | null
  city: string | null
  country: string | null
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
