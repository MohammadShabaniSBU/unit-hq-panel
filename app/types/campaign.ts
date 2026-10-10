export type CampaignTypeName = 'campaign' | 'newsletter' | 'announcement'

export type CampaignStatusName
  = | 'draft'
    | 'pending_approval'
    | 'scheduled'
    | 'sending'
    | 'paused'
    | 'sent'
    | 'cancelled'

export type CampaignChannelName = 'email' | 'sms'

export interface CampaignCounts {
  pending: number
  claimed: number
  sent: number
  skipped: number
  failed: number
}

export interface CampaignSendRow {
  id: number
  channel: CampaignChannelName
  template_family_id: number
  template_version_id: number | null
  version_number: number | null
  template_family_name: string | null
  subject_override: string | null
  scheduled_at: string | null
  completed_at: string | null
  status: string
}

export interface Campaign {
  id: number
  type: CampaignTypeName
  name: string
  status: CampaignStatusName
  subscription_list_id: number | null
  segment_id: number | null
  site_ids: Array<number>
  estimated_recipients: number | null
  newsletter_issue_number: number | null
  ignore_send_window: boolean
  approval_required: boolean
  submitted_by: number | null
  rejected_reason: string | null
  creator?: {
    id: number
    name: string
  } | null
  sends: Array<CampaignSendRow>
  counts: CampaignCounts | null
  open_rate: number | null
  created_at: string | null
  updated_at: string | null
}

export interface AudienceSample {
  id: number
  first_name: string
  last_name: string
  email: string | null
  status: string | null
}

export interface AudienceChannelPreview {
  count: number
  by_skip_reason_estimate: Record<string, number>
  sample: Array<AudienceSample>
  sms_segments?: number
}

export interface AudiencePreview {
  count: number
  by_skip_reason_estimate: Record<string, number>
  sample: Array<AudienceSample>
  channels: Record<string, AudienceChannelPreview>
  sms_unreachable?: number
  approval_required: boolean
  approval_reasons: Array<string>
  sms_segments?: number
}

export interface CampaignContentPreview {
  channel: string
  subject: string | null
  html: string | null
  text: string
  sms_segments: number | null
  version_number: number | null
}

export interface CampaignReportMetrics {
  targeted: number
  pending: number
  claimed: number
  sent: number
  skipped: number
  failed: number
  by_skip_reason: Record<string, number>
  delivered: number
  bounced: number
  opened: number
  clicked: number
  complained: number
  unsubscribed: number
  rates: {
    opened: number | null
    clicked: number | null
    unsubscribed: number | null
  }
}

export interface CampaignReportSend extends CampaignReportMetrics {
  id: number
  channel: string
}

export interface CampaignEngagementHour {
  hour: number
  opened: number
  clicked: number
}

export interface CampaignEngagement {
  anchor: string | null
  hours: Array<CampaignEngagementHour>
}

export interface CampaignReport {
  opens_approximate: boolean
  sends: Array<CampaignReportSend>
  total: CampaignReportMetrics
  engagement?: CampaignEngagement
}

export interface CampaignRecipientRow {
  id: number
  campaign_send_id: number
  channel: string | null
  contact_id: number
  contact_name: string | null
  status: string
  skip_reason: string | null
  message_id: number | null
}

export interface FieldErrors {
  [key: string]: Array<string>
}

const STEP_FIELDS: Array<[string, number]> = [
  ['name', 0],
  ['subscription_list_id', 1],
  ['segment_id', 1],
  ['site_ids', 1],
  ['template_family_id', 2],
  ['channel', 2],
  ['subject_override', 2],
  ['sends', 2],
  ['scheduled_at', 3],
  ['ignore_send_window', 3],
  ['status', 4],
  ['to', 4],
  ['approved_by', 4]
]

export function readFieldErrors(err: unknown): FieldErrors {
  const data = (err as { data?: { errors?: FieldErrors } }).data
  return data?.errors ?? {}
}

export function firstStepForErrors(errors: FieldErrors): number | null {
  for (const [field, step] of STEP_FIELDS) {
    if (errors[field]?.length) {
      return step
    }
  }

  return Object.keys(errors).length > 0 ? 4 : null
}

export function campaignDetailPath(type: CampaignTypeName, id: number): string {
  if (type === 'announcement') {
    return `/marketing/announcements/${id}`
  }

  return `/marketing/campaigns/${id}`
}
