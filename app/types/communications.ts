export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'call'

export type CommunicationProvider = 'brevo' | 'postmark' | 'mandrill' | 'twilio' | 'sinch' | 'aircall'

export type CredentialStatus = 'disconnected' | 'connected' | 'error'

export interface CredentialFieldMeta {
  label: string
  secret: boolean
}

export interface MaskedCredentialField {
  masked: string | null
  has_value: boolean
}

export interface ProviderOption {
  provider: CommunicationProvider
  label: string
  credential_fields: Record<string, CredentialFieldMeta>
  sends_email: boolean
  sends_sms: boolean
  auto_registers_webhooks: boolean
  reports_delivery_events: boolean
}

export interface ApiCommunicationAccount {
  id: number
  scope: 'company' | 'site'
  site_id: number | null
  channel: CommunicationChannel
  provider: CommunicationProvider
  is_active: boolean
  credentials: Record<string, MaskedCredentialField>
  credentials_unreadable: boolean
  webhook_url: string | null
  webhook_configured: boolean
  webhook_configured_at: string | null
  auto_registers_webhooks: boolean
  status: CredentialStatus
  verified_at: string | null
  last_error: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ApiCommunicationChannel {
  channel: CommunicationChannel
  label: string
  active_provider: CommunicationProvider | null
  accounts: Array<ApiCommunicationAccount>
  provider_options: Array<ProviderOption>
}

export interface ApiSiteSenderIdentity {
  id: number | null
  site_id: number
  channel: CommunicationChannel
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
