export type AccessProvider = 'sensorberg'

export type CredentialStatus = 'disconnected' | 'connected' | 'error'

export type AccessWebhookState = 'unconfigured' | 'configured'

export type AccessCredentialMode = 'app_invite' | 'pin'

export type AccessPointType = 'unit_door' | 'gate' | 'zone'

export type AccessPointMappingStatus = 'unassigned' | 'assigned' | 'vanished' | 'archived'

export type AccessGrantState = 'applying' | 'applied' | 'revoking' | 'revoked' | 'failed'

export type AccessEventType = 'granted' | 'denied'

export type AccessRestrictionContext = 'suspended' | 'overlocked'

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

export interface ApiUnknownGrant {
  grant_ref: string
  provider_point_id?: string
  credential_ref?: string | null
}

export interface ApiDriftIncident {
  contract_id: number
  grant_ref: string
  access_point_id?: number
  contact_id?: number
  occurred_at: string
}

export interface ApiSyncAttention {
  applied_count: number
  failed_count: number
  unknown_grants: Array<ApiUnknownGrant>
  drift_denied_but_granted: Array<ApiDriftIncident>
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
  last_full_synced_at: string | null
  sync_attention?: ApiSyncAttention
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

export interface ApiAccessPointMappingRow {
  id: number | null
  status: AccessPointMappingStatus
  provider_point_id: string
  label: string
  kind_hint: string | null
  point_type: AccessPointType | string | null
  site_id: number | null
  site_name: string | null
  unit_id: number | null
  unit_number: string | null
  archived_at: string | null
}

export interface ApiAccessPoint {
  id: number
  status: AccessPointMappingStatus
  access_provider_account_id?: number
  provider_point_id: string
  label: string
  point_type: AccessPointType | string
  site_id: number
  site_name: string | null
  unit_id: number | null
  unit_number: string | null
  archived_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ApiAccessPointSuggestion {
  provider_point_id: string
  label: string
  suggested_site_id: number
  suggested_unit_id: number
  suggested_point_type: AccessPointType | string
  confidence: string
}

export interface ApiAccessGrant {
  id: number
  point_id: number
  label: string | null
  point_type: AccessPointType | string | null
  contact_id: number
  contact_name: string | null
  contract_id: number
  state: AccessGrantState | string
  last_error: string | null
  applied_at: string | null
  can_retry: boolean
}

export interface ApiUnitAccess {
  mapped: boolean
  point: {
    id: number
    label: string
    point_type: AccessPointType | string
    provider_point_id: string
  } | null
  grants: Array<ApiAccessGrant>
  overlock_denies_door: boolean
  suspension_denies: boolean
}

export interface ApiAccessEvent {
  id: number
  occurred_at: string | null
  event_type: AccessEventType | string
  access_point_id: number | null
  point_label: string | null
  provider_point_id: string | null
  site_id: number | null
  unit_id: number | null
  contact_id: number | null
  contact_name: string | null
  provider_credential_ref: string | null
  access_grant_id: number | null
  restriction_context: AccessRestrictionContext | string | null
}
