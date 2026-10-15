import type { BillingAnchorModel, BillingInterval, ProrationMethod } from '~/types/contract'
import type { DateFormatPattern } from '~/utils/orgDateFormat'

export type { DateFormatPattern }

export type EmailFontStack = 'system' | 'arial' | 'georgia' | 'verdana' | 'trebuchet'

export const EMAIL_FONT_STACKS: Array<EmailFontStack> = [
  'system',
  'arial',
  'georgia',
  'verdana',
  'trebuchet'
]

export interface ApiGeneralSettings {
  company_name: string
  company_contact_email: string
  phone: string
  date_format: DateFormatPattern
  email_accent_color: string
  email_logo_asset_id: number | null
  email_logo_url: string | null
  email_text_color: string
  email_background_color: string
  email_font_stack: EmailFontStack
}

export interface ApiBillingSettings {
  default_currency: string
  default_billing_interval: BillingInterval
  default_billing_interval_count: number
  billing_anchor_model: BillingAnchorModel
  billing_anchor_day: number
  proration_method: ProrationMethod
  default_deposit_amount: string
  billing_horizon_days: number
}

export interface ApiLeasingSettings {
  default_offer_expiration_value: number
  default_offer_expiration_unit: string
  default_reservation_expiration_value: number
  default_reservation_expiration_unit: string
}

export type MarketingPlaybookKind = 'debt_process' | 'lead_chase'

export const MARKETING_PLAYBOOK_KINDS: Array<MarketingPlaybookKind> = ['debt_process', 'lead_chase']

export interface ApiMarketingSettings {
  marketing_frequency_cap_count: number
  marketing_frequency_cap_days: number
  marketing_exclude_delinquent: boolean
  marketing_exclude_active_playbook_kinds: Array<MarketingPlaybookKind>
  marketing_approval_threshold: number
  marketing_newsletter_bypasses_cap: boolean
  announcement_approval_required: boolean
}

export type { ApiActivityLogSettings } from '~/types/activity'
