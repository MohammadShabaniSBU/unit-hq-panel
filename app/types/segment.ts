import type { FilterGroup } from '~/types/filter'

export interface Segment {
  id: number
  name: string
  description: string | null
  entity_type: 'contact'
  filter: FilterGroup
  is_shared: boolean
  created_by: number | null
  archived_at: string | null
  count: number | null
  invalid_field: string | null
  created_at: string | null
  updated_at: string | null
}

export interface SegmentPayload {
  name: string
  description?: string | null
  filter: FilterGroup
  is_shared: boolean
}

export interface SegmentPreview {
  count: number
  sample: Array<{
    id: number
    first_name: string
    last_name: string
    email: string | null
    status: string | null
  }>
}
