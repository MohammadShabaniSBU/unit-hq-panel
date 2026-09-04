export interface ApiVoiceBridgeToken {
  id: number
  token: string
  site_id: number
  phone_number: string | null
  main_line_number: string | null
  voicemail_number: string | null
  label: string | null
  is_revoked: boolean
  revoked_at: string | null
  created_at: string
  secret?: string
}

export interface VoiceBridgeTokenForm {
  phone_number: string
  main_line_number: string
  voicemail_number: string
  label: string
}
