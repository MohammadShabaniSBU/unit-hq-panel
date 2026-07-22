import type { ContactLifecycleStatus } from '~/types/contact'

export interface ContactCard {
  id: number
  first_name: string
  last_name: string
  company: string | null
  email: string | null
  status: ContactLifecycleStatus
  deals_count?: number
  updated_at: string
}

export interface ContactBoardColumn {
  status: ContactLifecycleStatus
  total: number
  cards: Array<ContactCard>
  next_cursor: string | null
  has_more: boolean
}

export interface ContactBoard {
  columns: Array<ContactBoardColumn>
}
