import type { DiscountKind, DiscountParams } from '~/types/facility'

export interface ApiDiscountRef {
  id: number
  name: string
  kind: DiscountKind
  params: DiscountParams
  tracks_rate_changes?: boolean
}

export interface ApiDiscountScheduleSegment {
  from: string
  to: string | null
  amount: string
}

export interface ApiDiscountSchedule {
  noop: boolean
  resolved_tier: {
    min_commitment_weeks: number
    free_weeks: number
  } | null
  segments: Array<ApiDiscountScheduleSegment>
}

export interface ApiDiscountResolution {
  commitment_weeks: number | null
  warning: 'no_stay_length' | string | null
  resolved_tier: {
    min_commitment_weeks: number
    free_weeks: number
  } | null
  noop: boolean
  promo_line: string | null
  discount_schedule: ApiDiscountSchedule | null
}
