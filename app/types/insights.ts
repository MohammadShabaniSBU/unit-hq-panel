export type AnalyticsProviderKey = 'metabase' | 'iframe' | string

export type AnalyticsConnectionStatus = 'pending' | 'connected' | 'error' | 'disconnected'

export type InsightReportSource = 'native' | 'embedded'

export type InsightResourceKind = 'dashboard' | 'question'

export type InsightVisibility = 'all' | 'company_only' | 'site_staff'

export type InsightSiteScopeMode = 'inherit' | 'ignore'

export type InsightParamValueSource = 'static' | 'dynamic'

export type InsightParamBinding = 'locked' | 'default'

export type ValidationStatus
  = 'unknown'
    | 'valid'
    | 'resource_missing'
    | 'param_mismatch'
    | 'unreachable'

export type DynamicParamKey
  = 'current_site_id'
    | 'visible_site_ids'
    | 'current_employee_id'
    | 'site_currency'
    | 'site_timezone'
    | 'today'
    | 'month_start'
    | 'month_end'
    | 'year_start'
    | 'locale'

export type ProviderEmbeddingMode = 'disabled' | 'enabled' | 'locked'

export interface CredentialFieldMeta {
  label: string
  secret: boolean
}

export interface MaskedCredentialField {
  masked: string | null
  has_value: boolean
}

export interface AnalyticsProviderDescriptor {
  key: AnalyticsProviderKey
  label: string
  credential_fields: Record<string, CredentialFieldMeta>
  resource_kinds: Array<InsightResourceKind | string>
  lists_resources: boolean
  describes_params: boolean
}

export interface AnalyticsAccount {
  id: number
  provider: AnalyticsProviderKey
  display_name: string
  base_url: string
  private_base_url: string | null
  credentials: Record<string, MaskedCredentialField>
  credentials_unreadable: boolean
  is_default: boolean
  connection_status: AnalyticsConnectionStatus
  last_error: string | null
  last_verified_at: string | null
  archived_at: string | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AnalyticsResource {
  ref: string
  name: string
  collection: string | null
  enabled_for_embedding: boolean
}

export interface DiscoveredParam {
  slug: string
  name: string
  type: string
  embedding_mode: ProviderEmbeddingMode | string
  required: boolean
}

export interface InsightReportParam {
  id?: number
  name: string
  value_source: InsightParamValueSource
  static_value: string | number | boolean | Array<string | number> | null
  dynamic_key: DynamicParamKey | string | null
  binding: InsightParamBinding
  is_required: boolean
  sort_order: number
}

export interface InsightReportOptions {
  bordered?: boolean
  titled?: boolean
  downloads?: boolean
  /** Panel-only CSS height pin (`800px`, `70vh`). Skips iframe-resizer. */
  height?: string
  [key: string]: unknown
}

export interface ValidationDetail {
  reason?: string
  message?: string
  mismatches?: Array<{
    slug: string
    instruction?: string
    [key: string]: unknown
  }>
  unknown_slugs?: Array<string>
  [key: string]: unknown
}

export interface InsightReport {
  id: number
  key: string
  source: InsightReportSource
  native_key: string | null
  analytics_account_id: number | null
  resource_kind: InsightResourceKind | string | null
  resource_ref: string | null
  labels: Record<string, string> | null
  description: Record<string, string> | null
  resolved_label: string
  label_source: InsightLabelSource
  icon: string | null
  section: string | null
  sort_order: number
  visibility: InsightVisibility
  site_scope_mode: InsightSiteScopeMode
  options: InsightReportOptions
  is_system: boolean
  archived_at: string | null
  last_validated_at: string | null
  validation_status: ValidationStatus
  validation_detail: ValidationDetail | null
  created_by: number | null
  created_at: string | null
  updated_at: string | null
  params: Array<InsightReportParam>
  connection_status?: AnalyticsConnectionStatus | null
  validation_warning?: boolean
}

export interface InsightReportWritePayload {
  key?: string
  source?: InsightReportSource
  native_key?: string | null
  analytics_account_id?: number | null
  resource_kind?: InsightResourceKind | string | null
  resource_ref?: string | null
  labels?: Record<string, string> | null
  description?: Record<string, string> | null
  icon?: string | null
  section?: string | null
  sort_order?: number
  visibility?: InsightVisibility
  site_scope_mode?: InsightSiteScopeMode
  options?: InsightReportOptions
  params?: Array<{
    name: string
    value_source: InsightParamValueSource
    static_value?: string | number | boolean | Array<string | number> | null
    dynamic_key?: DynamicParamKey | string | null
    binding?: InsightParamBinding
    is_required?: boolean
    sort_order?: number
  }>
}

export interface AnalyticsAccountWritePayload {
  provider?: AnalyticsProviderKey
  display_name: string
  base_url: string
  private_base_url?: string | null
  credentials?: Record<string, string>
  is_default?: boolean
}

export interface AnalyticsVerifyResult {
  status: AnalyticsConnectionStatus
  last_error: string | null
  last_verified_at: string | null
}

/** Local param-editor row (not automation ValueSource). */
export interface InsightParamDraft {
  name: string
  provider_type: string
  embedding_mode: ProviderEmbeddingMode | string
  is_required: boolean
  value_source: InsightParamValueSource
  static_value: string
  dynamic_key: DynamicParamKey | ''
  binding: InsightParamBinding
  sort_order: number
  error: string | null
}

export const NATIVE_REPORT_KEYS = [
  'dashboard',
  'rent-roll',
  'occupancy',
  'ageing',
  'collections',
  'deposit-liability',
  'daily-close',
  'movement',
  'funnel',
  'demo'
] as const

export const DYNAMIC_PARAM_KEYS: Array<DynamicParamKey> = [
  'current_site_id',
  'visible_site_ids',
  'current_employee_id',
  'site_currency',
  'site_timezone',
  'today',
  'month_start',
  'month_end',
  'year_start',
  'locale'
]

export const DYNAMIC_PARAM_TYPES: Record<DynamicParamKey, string> = {
  current_site_id: 'int',
  visible_site_ids: 'array<int>',
  current_employee_id: 'int',
  site_currency: 'string',
  site_timezone: 'string',
  today: 'date',
  month_start: 'date',
  month_end: 'date',
  year_start: 'date',
  locale: 'string'
}

export function dynamicKeyIsArray(key: DynamicParamKey): boolean {
  return DYNAMIC_PARAM_TYPES[key].startsWith('array')
}

export function providerTypeIsArray(type: string): boolean {
  const normalized = type.toLowerCase()
  return normalized.includes('array') || normalized.includes('[]') || normalized === 'list'
}

export function compatibleDynamicKeys(providerType: string): Array<DynamicParamKey> {
  const wantArray = providerTypeIsArray(providerType)
  return DYNAMIC_PARAM_KEYS.filter(key => dynamicKeyIsArray(key) === wantArray)
}

export type InsightLabelSource = 'i18n' | 'operator'

export interface InsightNavItem {
  id: number
  key: string
  source: InsightReportSource
  native_key: string | null
  label: string
  label_source: InsightLabelSource
  icon: string | null
  section: string | null
  sort_order: number
  site_scope_mode: InsightSiteScopeMode
  options: InsightReportOptions
  validation_status: ValidationStatus
  connection_status?: AnalyticsConnectionStatus
  provider?: AnalyticsProviderKey
}

export interface InsightEmbedPayload {
  url: string
  expires_at: string
}

export type InsightEmbedErrorKey
  = 'account_archived'
    | 'credentials_unreadable'
    | 'site_required'
    | 'param_unresolved'
    | 'unknown_dynamic_key'
    | 'provider_not_embeddable'
    | 'report_is_native'
    | 'iframe_timeout'
    | 'not_found'
    | 'too_many_attempts'
    | 'generic'

export function resolveInsightLabel(
  item: Pick<InsightNavItem, 'label' | 'label_source'>,
  t: (key: string) => string
): string {
  if (item.label_source === 'i18n') {
    return t(item.label)
  }
  return item.label
}
