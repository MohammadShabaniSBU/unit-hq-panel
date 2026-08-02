export type DelinquencyPolicyAction
  = 'assess_late_fee'
    | 'place_overlock'
    | 'release_overlock'
    | 'record_notice'
    | 'create_task'
    | 'revoke_access'

export type DelinquencyStepAction
  = DelinquencyPolicyAction
    | 'restore_access'
    | 'cure'
    | 'pause'
    | 'resume'
    | 'write_off'

export type DelinquencyStepTrigger = 'ladder' | 'manual' | 'cure' | 'playbook'

export type DelinquencyCureTrigger = 'payment' | 'write_off' | 'vacated' | 'manual'

export type LateFeeType = 'flat' | 'percent'

export type NoticeType
  = 'payment_reminder'
    | 'overdue'
    | 'final_demand'
    | 'retention'

export type NoticeChannel = 'email' | 'sms' | 'post' | 'in_person'

export type DaysBucket = '1-7' | '8-14' | '15-30' | '30+'

export type DelinquencyBoardStatus = 'open' | 'cured'

export interface AssessLateFeeParams {
  type: LateFeeType
  amount?: string
  percent?: string
  cap_per_case?: string
}

export interface RecordNoticeParams {
  notice_type: NoticeType
}

export interface CreateTaskParams {
  title_key: string
  urgent: boolean
}

export type DelinquencyStepParams
  = AssessLateFeeParams
    | RecordNoticeParams
    | CreateTaskParams
    | Record<string, never>

export interface ApiDelinquencyPolicyStep {
  id?: number
  offset_days: number
  action: DelinquencyPolicyAction
  params: DelinquencyStepParams
  sort: number
}

export interface ApiDelinquencyPolicy {
  id: number
  name: string
  auto_release_overlock: boolean
  auto_restore_access: boolean
  sites_count?: number
  steps: Array<ApiDelinquencyPolicyStep>
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiDelinquencyFiscalFlags {
  late_fee_tax: string
  invoice_late_fees: boolean
}

export interface ApiDelinquencyPoliciesPayload {
  policies: Array<ApiDelinquencyPolicy>
  fiscal: ApiDelinquencyFiscalFlags
}

export type DelinquencyPolicyListStatus = 'active' | 'archived' | 'all'

export interface ApiDelinquencyNextStep {
  action: string
  offset_days: number
  days_until: number
  predicted_on: string
  policy_step_id: number
}

export interface ApiDelinquencyFeeSuggestion {
  amount: string
  base: string
  params: AssessLateFeeParams
}

export interface ApiDelinquencyTimelineCharge {
  id: number
  charge_type: string
  amount: string
  net_amount: string | null
  tax_amount: string | null
  currency: string
  due_date: string | null
  description: string | null
}

export interface ApiDelinquencyTimelineNotice {
  id: number
  notice_type: string
  sent_at: string | null
  sent_channel: string | null
  sent_to: string | null
  effective_date: string | null
  required_by: string | null
}

export interface ApiDelinquencyTimelineTask {
  id: number
  title: string
  status: string
  priority: string
}

export interface ApiDelinquencyTimelineActor {
  id: number
  name: string
}

export interface ApiDelinquencyTimelineStep {
  entry_type?: 'step' | 'call'
  id: number | string
  delinquency_id?: number
  policy_step_id?: number | null
  action?: DelinquencyStepAction | string
  executed_on: string | null
  trigger?: DelinquencyStepTrigger | string
  detail?: Record<string, unknown> | null
  created_by?: ApiDelinquencyTimelineActor | null
  charge?: ApiDelinquencyTimelineCharge | null
  unit_hold?: {
    id: number
    unit_id: number
    hold_type: string
    starts_on: string | null
    released_at: string | null
    reason: string | null
  } | null
  contract_notice?: ApiDelinquencyTimelineNotice | null
  task?: ApiDelinquencyTimelineTask | null
  created_at: string | null
  // Call entries (entry_type === 'call')
  message_id?: number
  thread_id?: number
  direction?: string
  outcome?: string | null
  duration?: number | null
  disposition?: string | null
  body_text?: string | null
  call_intent?: {
    id?: number
    context_type?: string
    context_id?: number
    correlation?: string
  } | null
}

export interface ApiActivePlaybookEnrolment {
  playbook_id: number
  run_id: number
  automation_id: number
  step_index: number
  step_total: number
  waiting_until: string | null
  status: string
}

export interface ApiDelinquencyCase {
  id: number
  contract_id: number
  delinquency_policy_id: number
  policy_name?: string | null
  auto_release_overlock?: boolean
  auto_restore_access?: boolean
  access_suspended?: boolean
  pending_restore?: boolean
  anchor_due_date: string
  opened_on: string
  cured_on: string | null
  cure_trigger: DelinquencyCureTrigger | string | null
  paused_at: string | null
  paused_reason: string | null
  is_paused: boolean
  is_open: boolean
  contact_id: number | null
  contact_name: string | null
  site_id: number | null
  site_name: string | null
  unit_numbers: Array<string>
  currency: string | null
  days_overdue: number | null
  overdue_rent: string
  overdue_fees: string
  overdue_total: string
  overlocked: boolean
  autopay_enabled: boolean
  failed_autopay: boolean
  last_payment_at: string | null
  policy_steps: Array<ApiDelinquencyPolicyStep>
  executed_policy_step_ids: Array<number>
  next_step: ApiDelinquencyNextStep | null
  active_playbook_enrolment?: ApiActivePlaybookEnrolment | null
  timeline?: Array<ApiDelinquencyTimelineStep>
  fee_suggestion?: ApiDelinquencyFeeSuggestion | null
  live_overlock_unit_ids?: Array<number>
  created_at: string
  updated_at: string
}

export interface ApiDelinquencyCurrencyTotal {
  currency: string
  amount: string
}

export interface ApiDelinquencyBoardMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  open_count: number
  overdue_by_currency: Array<ApiDelinquencyCurrencyTotal>
  overlocked_count: number
  failed_autopay_count: number
}
