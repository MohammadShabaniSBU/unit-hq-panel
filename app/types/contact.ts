export type ContactStatus = 'lead' | 'reserved' | 'active' | 'overdue'

export type ContactType = 'individual' | 'business'

export type ContactActivityChannel = 'whatsapp' | 'email' | 'phone'

export interface ContactOwner {
  name: string
  initials: string
}

export interface ContactLastActivity {
  at: string
  channel: ContactActivityChannel
}

export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  type: ContactType
  status: ContactStatus
  site: string
  lastActivity: ContactLastActivity
  deals: number
  balance: number
  owner: ContactOwner
}

export type ContactStatusFilter = ContactStatus | 'all'

export type ContactSortOrder = 'newest' | 'oldest'

export interface ContactTabCounts {
  all: number
  lead: number
  reserved: number
  active: number
  overdue: number
}
