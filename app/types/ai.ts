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

export type AiUsageGroupBy = 'employee' | 'model' | 'purpose' | 'day'

export interface AiUsageCurrencyTotal {
  currency: string | null
  estimated_cost: string
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  tool_calls: number
  turns: number
}

export interface AiUsageReportRow {
  employee_id?: number | null
  model?: string
  purpose?: string
  day?: string
  currencies: Array<AiUsageCurrencyTotal>
}

export interface AiUsageReportMeta {
  from: string
  to: string
  group_by: AiUsageGroupBy
  orphaned_count: number
  estimated_token_share: number
}

export interface AiUsageReportResponse {
  message: string
  data: Array<AiUsageReportRow>
  meta: AiUsageReportMeta
}
