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

export type EsignEnvelopeStatus =
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'cancelled'

export type ContractDocumentStatus =
  | 'draft'
  | 'sent'
  | 'signed'
  | 'superseded'

export interface ApiContractDocument {
  id: number
  contract_id: number
  template_family_id: number
  template_variant_id: number
  locale: string | null
  rendered_at: string | null
  sha256: string
  sha256_prefix: string
  status: ContractDocumentStatus | string
  envelope_id: number | null
  created_at: string | null
  updated_at: string | null
}

export interface ApiEsignEnvelope {
  id: number
  contract_id: number
  contract_document_id: number
  document_sha256: string | null
  document_sha256_prefix: string | null
  esign_provider_account_id: number
  provider_envelope_ref: string
  signer_name: string
  signer_email: string
  status: EsignEnvelopeStatus | string
  decline_reason: string | null
  expires_at: string | null
  sent_at: string | null
  viewed_at: string | null
  signed_at: string | null
  signed_pdf_sha256: string | null
  has_signed_pdf: boolean
  has_certificate: boolean
  completion_pending: boolean
  post_cancellation: boolean
  created_by: number | null
  created_at: string | null
  updated_at: string | null
}
