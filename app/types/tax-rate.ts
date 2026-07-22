import type { ApiOption } from '~/types/facility'

export interface ApiTaxRateOption extends ApiOption {
  code: string
}

export interface ApiTaxRate {
  id: number
  name: string
  code: string
  rate: string
  jurisdiction: string | null
  is_default: boolean
  effective_from: string
  effective_to: string | null
  created_at: string
}
