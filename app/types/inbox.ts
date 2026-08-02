export type InboxChannel = 'email' | 'sms' | 'call'
export type InboxChannelTab = 'all' | InboxChannel
export type InboxFilter = 'mine' | 'unassigned' | 'all'
export type InboxMessageDirection = 'inbound' | 'outbound'
export type InboxMessageSource = 'manual' | 'offer' | 'playbook' | 'automation' | 'system'

export interface ApiInboxContactSummary {
  id: number | null
  name: string
  avatar_initials: string
}

export interface ApiInboxPreview {
  direction: InboxMessageDirection
  body_excerpt: string
  status: string
  at: string | null
}

export interface ApiInboxAssignee {
  id: number
  name: string
}

export interface ApiInboxThreadSummary {
  id: number
  channel: InboxChannel
  contact: ApiInboxContactSummary
  subject: string | null
  channel_key: string | null
  preview: ApiInboxPreview | null
  unread_count: number
  assigned_employee: ApiInboxAssignee | null
  last_message_at: string | null
  suppressed: boolean
}

export interface ApiInboxAttachment {
  id: number
  filename: string
  size: number
  mime: string
}

export interface ApiInboxMessageBody {
  format: 'html' | 'text'
  content: string | null
}

export interface ApiInboxDeliveryEvent {
  status: string
  raw_status?: string | null
  provider_event_id?: string | null
  occurred_at?: string | null
  reason?: string | null
  is_permanent?: boolean
  recorded_at?: string | null
}

export interface ApiInboxCallSourceRef {
  call?: Record<string, unknown>
  event?: string
  recording_url?: string | null
  voicemail_url?: string | null
  asset_url?: string | null
  duration?: number | null
  outcome?: string | null
  agent?: string | null
  missed_call_reason?: string | null
}

export type ApiInboxSourceRef = ApiInboxCallSourceRef & {
  offer_id?: number
  offer_delivery_id?: number
  automation_id?: number
  automation_run_id?: number
  automation_run_step_id?: number
  playbook_id?: number
  [key: string]: unknown
}

export interface ApiInboxMessage {
  id: number
  direction: InboxMessageDirection
  status: string
  body: ApiInboxMessageBody
  attachments: Array<ApiInboxAttachment>
  source: InboxMessageSource
  source_ref: ApiInboxSourceRef | null
  sent_at: string | null
  created_at: string
  delivery_events: Array<ApiInboxDeliveryEvent> | null
  from_address: string
  to_address: string
  rethreaded: boolean
  rethreaded_from_thread_id: number | null
}

export type InboxListMode = 'threads' | 'triage'

export interface ApiCommsTriagePreview {
  from: string | null
  to: string | null
  subject: string | null
  body_text: string | null
  channel: string | null
}

export interface ApiCommsTriageSummary {
  id: number
  channel: InboxChannel
  sender_value: string
  preview: ApiCommsTriagePreview
  created_at: string | null
}

export interface ApiCommsTriageDetail extends ApiCommsTriageSummary {
  body: ApiInboxMessageBody
}

export interface ApiCommsTriageResolveResult {
  triage_id: number
  message_id: number
  message_thread_id: number
  contact_id: number
  status: 'resolved'
}

export interface ApiCommsTriageDiscardResult {
  triage_id: number
  status: 'discarded'
}

export interface ApiInboxMoveTarget {
  id: number
  subject: string | null
  channel_key: string | null
  last_message_at: string | null
  preview_excerpt: string | null
}

export interface ApiInboxMoveResult {
  message_id: number
  message_thread_id: number
  from_thread_id: number | null
}

export interface ApiInboxThreadDetail extends ApiInboxThreadSummary {
  messages: Array<ApiInboxMessage>
  meta: {
    next_before: string | null
  }
}

export interface ApiInboxBadge {
  unread_threads: number
  triage_count: number
}

export interface ApiInboxFromIdentity {
  address?: string
  number?: string
  label: string | null
}

export interface ApiInboxSuppression {
  scope: 'all' | 'marketing'
  reason: string
  created_at: string | null
}

export interface ApiInboxTemplateOption {
  id: number
  name: string
}

export interface ApiComposeContext {
  from_identity: ApiInboxFromIdentity | null
  suppression: ApiInboxSuppression | null
  templates: Array<ApiInboxTemplateOption>
  tokens: Array<string>
}

export interface ApiInboxCursorResponse<T> {
  message: string
  data: Array<T>
  meta: {
    next_cursor: string | null
  }
}

export interface ApiInboxReplyResult {
  thread_id: number
  message: ApiInboxMessage
}

export interface ApiInboxContextChannel {
  type: string
  value: string
  suppressed: boolean
}

export interface ApiInboxContextContact {
  id: number | null
  name: string
  status: string | null
  email: string | null
  phone: string | null
  fiscal_complete: boolean
  channels: Array<ApiInboxContextChannel>
}

export type InboxAutopayStatus = 'on' | 'off' | 'failing'

export interface ApiInboxContextDelinquency {
  id: number
  days: number
  stage_label: string
}

export interface ApiInboxContextContract {
  id: number
  unit_number: string | null
  site_name: string | null
  monthly_display: {
    amount: string | null
    currency: string | null
  }
  balance: {
    owed: string
    overdue: string
    currency: string
  }
  autopay: InboxAutopayStatus
  autopay_attempt_id: number | null
  delinquency: ApiInboxContextDelinquency | null
}

export interface ApiInboxContextOpenDeal {
  id: number
  title: string
  stage: string
  move_in: string | null
}

export interface ApiInboxContextLeadEnrolment {
  playbook_id: number
  playbook: string | null
  step_x_of_y: string
  next_at: string | null
}

export interface ApiInboxContextRecent {
  type: string
  at: string | null
  summary: string | null
}

export interface ApiInboxContext {
  contact: ApiInboxContextContact | null
  tenancy: { active_contracts: Array<ApiInboxContextContract> }
  pipeline: {
    open_deal: ApiInboxContextOpenDeal | null
    lead_enrolment: ApiInboxContextLeadEnrolment | null
  }
  recent: Array<ApiInboxContextRecent>
}
