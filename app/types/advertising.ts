export type AdProvider = 'google_ads' | 'meta'

export type AdAccountStatus = 'active' | 'inactive' | 'error'

export interface MaskedCredential {
  masked: string | null
  has_value: boolean
}

export interface AdPlatformAccount {
  id: number
  provider: AdProvider
  name: string
  external_account_id: string
  login_customer_id: string | null
  currency: string | null
  timezone: string | null
  is_active: boolean
  credentials: Record<string, MaskedCredential>
  credentials_unreadable: boolean
  last_verified_at: string | null
  last_synced_at: string | null
  last_error: string | null
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdAccountSummary {
  id: number
  name: string
  provider: AdProvider
  currency: string | null
  is_active: boolean
}

export interface AdvertisingSetup {
  accounts_connected: boolean
  tag_seen: boolean
  enquiry_form: boolean
  mappings_set: boolean
  campaigns_mapped: boolean
  accounts: Array<AdAccountSummary>
}

export interface TagProbe {
  found: boolean
  occurred_at: string | null
}

export interface GoogleCustomer {
  id: string
}

export interface AdCampaignSpend {
  currency: string
  cost: string
  impressions: number
  clicks: number
}

export type AdCampaignStatus = 'enabled' | 'paused' | 'removed'

export interface AdCampaign {
  id: number
  ad_platform_account_id: number
  provider: AdProvider | null
  external_id: string
  name: string
  status: AdCampaignStatus
  channel_type: string | null
  site_id: number | null
  unit_class_id: number | null
  utm_campaign_hint: string | null
  suggested_site_id: number | null
  spend?: Array<AdCampaignSpend>
}

export interface AdCampaignMapping {
  site_id: number
  unit_class_id?: number | null
  utm_campaign_hint?: string | null
}

export type ConversionEventKey = 'lead' | 'reservation' | 'move_in'
export type ConversionValueRule = 'none' | 'first_period_net'

export interface AdConversionMappingRow {
  event_key: ConversionEventKey
  external_ref: string | null
  value_rule: ConversionValueRule
  is_active: boolean
}

export interface AdConversionTarget {
  ref: string
  name: string
  kind: string
}

export interface AdConversionTestResult {
  ok: boolean
  error: string | null
}

export type AdDeliveryStatus = 'pending' | 'claimed' | 'sent' | 'skipped' | 'failed'

export interface AdConversionDelivery {
  id: number
  status: AdDeliveryStatus
  skip_reason: string | null
  identifiers_used: Array<string>
  attempts: number
  error: string | null
  processed_at: string | null
  account: {
    id: number
    name: string
    provider: AdProvider
  } | null
  event: {
    id: number
    event_key: ConversionEventKey
    occurred_at: string | null
    value: string | null
    currency: string | null
    contact: {
      id: number
      name: string
    }
  } | null
}

export interface AdDeliverySummaryRow {
  account_id: number
  status: AdDeliveryStatus
  skip_reason: string | null
  count: number
}

export interface MarketingTouchRow {
  occurred_at: string
  platform: AdProvider | null
  utm_campaign: string | null
  landing_path: string | null
}

export interface AcquiredVia {
  platform: AdProvider
  campaign_name: string | null
}
