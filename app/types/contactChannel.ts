export type ContactChannelType = 'email' | 'phone' | 'sms' | 'whatsapp'

export interface ApiContactChannel {
  id: number
  contact_id: number
  type: ContactChannelType
  value: string
  label: string | null
  is_primary: boolean
  opted_in: boolean
}

export const CONTACT_CHANNEL_TYPES: Array<ContactChannelType> = [
  'email',
  'phone',
  'sms',
  'whatsapp'
]
