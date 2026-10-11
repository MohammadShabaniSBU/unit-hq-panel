export interface PreferenceChannelState {
  channel: string
  subscribed: boolean
}

export interface PreferenceListState {
  id: number
  key: string
  label: string
  description: string
  channels: Array<PreferenceChannelState>
}

export interface PreferenceCenterPayload {
  contact_first_name: string | null
  locale: string | null
  lists: Array<PreferenceListState>
  advertising: PreferenceAdvertisingState | null
}

export interface PreferenceAdvertisingState {
  list_id: number
  subscribed: boolean
  label: string
  description: string
}

export interface PreferenceChange {
  list_id: number
  channel: string
  subscribed: boolean
}
