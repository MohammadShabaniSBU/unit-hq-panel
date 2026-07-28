import type { CredentialStatus } from '~/types/communications'

export interface ApiSiteStripeSetting {
  id: number | null
  site_id: number
  publishable_key: string | null
  secret_key_masked: string | null
  has_secret_key: boolean
  credentials_unreadable: boolean
  webhook_configured: boolean
  status: CredentialStatus
  verified_at: string | null
  last_error: string | null
  created_at: string | null
  updated_at: string | null
}
