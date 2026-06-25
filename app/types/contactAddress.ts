import type { ApiCountry } from '~/types/facility'

export type ContactAddressType = 'home' | 'work' | 'billing' | 'other'

export interface ApiContactAddress {
  id: number
  contact_id: number
  type: ContactAddressType
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country_id: number | null
  country: ApiCountry | null
  label: string | null
  is_primary: boolean
}

export const CONTACT_ADDRESS_TYPES: Array<ContactAddressType> = [
  'home',
  'work',
  'billing',
  'other'
]
