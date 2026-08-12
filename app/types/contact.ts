import type { TaxIdType } from '~/types/legalEntity'

export interface ApiContactSite {
  id: number
  name: string
  code: string | null
}

export interface ApiContact {
  id: number
  first_name: string
  last_name: string
  email: string | null
  company: string | null
  billing_name: string | null
  tax_id: string | null
  tax_id_type: TaxIdType | null
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_city: string | null
  billing_postal_code: string | null
  billing_country_code: string | null
  fiscal_complete: boolean
  status: ContactLifecycleStatus
  contact_status: string | null
  assigned_to: number | null
  created_by: number | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  sites?: Array<ApiContactSite>
}

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
