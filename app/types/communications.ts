export type CommunicationProviderType = 'brevo' | 'snich'

export type CredentialStatus = 'disconnected' | 'connected' | 'error'

export interface ApiCommunicationAccount {
  id: number | null
  scope: 'company' | 'site'
  site_id: number | null
  provider_type: CommunicationProviderType
  api_key_masked: string | null
  has_api_key: boolean
  credentials_unreadable: boolean
  webhook_configured: boolean
  webhook_configured_at: string | null
  status: CredentialStatus
  verified_at: string | null
  last_error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ApiSiteSenderIdentity {
  id: number | null
  site_id: number
  provider_type: CommunicationProviderType
  account_id: number | null
  from_name: string | null
  from_email: string | null
  from_number: string | null
  reply_to_email: string | null
  provider_sender_id: string | null
  verified_at: string | null
  created_at: string | null
  updated_at: string | null
}
