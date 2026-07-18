export type ActivitySubjectType = 'contact' | 'deal' | 'offer' | 'reservation' | 'contract'

export type ActivityLogChannel = 'core' | 'crm' | 'facility' | 'comms' | 'billing'

export interface ApiActivityCauser {
  id: number
  type: string | null
  name: string | null
}

export interface ApiActivity {
  id: number
  log_name: ActivityLogChannel | string
  description: string
  event: string | null
  subject_type: string | null
  subject_id: number | null
  causer_type: string | null
  causer_id: number | null
  properties: Record<string, unknown>
  attribute_changes: Record<string, unknown>
  created_at: string | null
  causer?: ApiActivityCauser | null
}

export interface ApiActivityLogSettings {
  channels: Array<ActivityLogChannel>
  retention_months: number
}
