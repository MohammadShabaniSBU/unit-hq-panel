import type { CredentialStatus } from '~/types/communications'

export interface ApiPaymentProviderAccount {
  id: number | null
  legal_entity_id: number
  provider: string
  display_name: string
  publishable_key: string | null
  secret_key_masked: string | null
  has_secret_key: boolean
  credentials_unreadable: boolean
  webhook_configured: boolean
  provider_account_id: string | null
  provider_account_mismatch: boolean
  status: CredentialStatus
  last_error: string | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}
