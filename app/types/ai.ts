export type AiProviderKey = 'anthropic' | string

export type AiConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected'

export interface CredentialFieldMeta {
  label: string
  secret: boolean
}

export interface MaskedCredentialField {
  masked: string | null
  has_value: boolean
}

export interface AiProviderDescriptor {
  key: AiProviderKey
  label: string
  credential_fields: Record<string, CredentialFieldMeta>
}

export interface AiProviderAccount {
  id: number
  provider: AiProviderKey
  display_name: string
  credentials: Record<string, MaskedCredentialField>
  credentials_unreadable: boolean
  allowed_models: Array<string>
  default_model: string | null
  is_default: boolean
  connection_status: AiConnectionStatus
  last_error: string | null
  last_verified_at: string | null
  archived_at: string | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AiProviderAccountCreatePayload {
  provider: AiProviderKey
  display_name: string
  credentials?: Record<string, string>
  is_default?: boolean
}

export interface AiProviderAccountUpdatePayload {
  display_name?: string
  credentials?: Record<string, string>
  allowed_models?: Array<string>
  default_model?: string | null
}

export interface AiVerifyResult {
  status: AiConnectionStatus
  last_error: string | null
  last_verified_at: string | null
  available_models: Array<string>
}
