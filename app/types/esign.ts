export type EsignProvider = 'signable'

export type CredentialStatus = 'disconnected' | 'connected' | 'error'

export type EsignWebhookState = 'unconfigured' | 'configured'

export interface CredentialFieldMeta {
  label: string
  secret: boolean
}

export interface MaskedCredentialField {
  masked: string | null
  has_value: boolean
}

export interface EsignProviderOption {
  provider: EsignProvider | string
  label: string
  credential_fields: Record<string, CredentialFieldMeta>
}

export interface ApiEsignAccount {
  id: number
  provider: EsignProvider | string
  display_name: string
  credentials: Record<string, MaskedCredentialField>
  credentials_unreadable: boolean
  webhook_url: string | null
  webhook_state: EsignWebhookState
  status: CredentialStatus
  last_error: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface ApiEsignSettings {
  accounts: Array<ApiEsignAccount>
  provider_options: Array<EsignProviderOption>
  active_provider: string | null
}
