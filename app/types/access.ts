export type AccessProvider = 'sensorberg'

export type CredentialStatus = 'disconnected' | 'connected' | 'error'

export type AccessWebhookState = 'unconfigured' | 'configured'

export type AccessCredentialMode = 'app_invite' | 'pin'

export interface CredentialFieldMeta {
  label: string
  secret: boolean
}

export interface MaskedCredentialField {
  masked: string | null
  has_value: boolean
}

export interface AccessProviderOption {
  provider: AccessProvider | string
  label: string
  credential_fields: Record<string, CredentialFieldMeta>
  credential_modes: Array<AccessCredentialMode | string>
}

export interface ApiAccessAccount {
  id: number
  provider: AccessProvider | string
  display_name: string
  credentials: Record<string, MaskedCredentialField>
  credentials_unreadable: boolean
  credential_modes: Array<AccessCredentialMode | string>
  webhook_url: string | null
  webhook_state: AccessWebhookState
  status: CredentialStatus
  last_error: string | null
  is_active: boolean
  discovered_points_count: number
  points_discovered_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AccessAttentionCounts {
  unmapped_points_count: number
  unresolved_contacts_count: number
}

export interface ApiAccessSettings {
  accounts: Array<ApiAccessAccount>
  provider_options: Array<AccessProviderOption>
  active_provider: string | null
  attention: AccessAttentionCounts
}
