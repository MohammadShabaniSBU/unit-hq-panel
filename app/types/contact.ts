export interface ApiContact {
  id: number
  first_name: string
  last_name: string
  email: string | null
  company: string | null
  status: ContactLifecycleStatus
  contact_status: string | null
  source: ContactSource | null
  source_detail: string | null
  assigned_to: number | null
  created_by: number | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export type ContactSource =
  | 'social_media'
  | 'google'
  | 'meta'
  | 'organic'
  | 'offline'
  | 'walk_ins'
  | 'calls'
  | 'emailing'
  | 'referrals'
  | 'aircall_paid'
  | 'email_conversations'
  | 'website'
  | 'web_form'
  | 'import'
  | 'other'

export const CONTACT_SOURCES: Array<ContactSource> = [
  'social_media',
  'google',
  'meta',
  'organic',
  'offline',
  'walk_ins',
  'calls',
  'emailing',
  'referrals',
  'aircall_paid',
  'email_conversations',
  'website',
  'web_form',
  'import',
  'other'
]

export type ContactLifecycleStatus =
  | 'prospect'
  | 'lead'
  | 'opportunity'
  | 'tenant'
  | 'past_tenant'
  | 'lost'

export type ContactStatusFilter = ContactLifecycleStatus | 'all'

export interface ContactTabCounts {
  all: number
  prospect: number
  lead: number
  opportunity: number
  tenant: number
  past_tenant: number
  lost: number
}

export const CONTACT_LIFECYCLE_STATUSES: Array<ContactLifecycleStatus> = [
  'prospect',
  'lead',
  'opportunity',
  'tenant',
  'past_tenant',
  'lost'
]
