export type PlaybookKind = 'debt_process' | 'lead_chase'

export type PlaybookStepAction =
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp_template'
  | 'create_task'
  | 'record_notice'

export type NoticeType = 'payment_reminder' | 'overdue' | 'final_demand' | 'retention'

export type EnrolmentListStatus = 'active' | 'exited'

export interface DebtEnrolmentFilters {
  site_ids?: Array<number>
  policy_ids?: Array<number>
  min_days_overdue?: number
}

export interface LeadEnrolmentFilters {
  site_ids?: Array<number>
  stages?: Array<string>
  sources?: Array<string>
}

export type EnrolmentFilters = DebtEnrolmentFilters | LeadEnrolmentFilters

export interface PlaybookStepParams {
  label?: string
  template_family_id?: number
  subject?: string
  body?: string
  tokens?: boolean
  title?: string
  urgent?: boolean
  notice_type?: NoticeType
  record_notice?: NoticeType | string
  whatsapp_template_name?: string
  variable_tokens?: Record<string, string>
}

export interface PlaybookStep {
  id?: number
  offsetDays: number
  action: PlaybookStepAction
  params: PlaybookStepParams
  sort: number
}

export interface Playbook {
  id: number
  kind: PlaybookKind
  name: string
  isActive: boolean
  enrolmentFilters: EnrolmentFilters
  automationId: number | null
  archivedAt: string | null
  activeEnrolmentCount: number | null
  steps: Array<PlaybookStep>
  createdAt: string
  updatedAt: string
}

export interface ApiPlaybookStep {
  id?: number
  playbook_id?: number
  offset_days: number
  action: PlaybookStepAction
  params: PlaybookStepParams | null
  sort: number
  created_at?: string
  updated_at?: string
}

export interface ApiPlaybook {
  id: number
  kind: PlaybookKind
  name: string
  is_active: boolean
  enrolment_filters: EnrolmentFilters
  automation_id: number | null
  archived_at: string | null
  active_enrolment_count?: number | null
  steps?: Array<ApiPlaybookStep>
  created_at: string
  updated_at: string
}

export interface PlaybookEnrolmentSubject {
  type: string | null
  id: number | null
  contact: { id: number, name: string } | null
  contract: { id: number } | null
  deal: { id: number } | null
  cure_trigger: string | null
  deal_status: string | null
}

export interface ApiPlaybookEnrolment {
  id: number
  automation_id: number
  playbook_id: number | null
  status: string
  cancel_cause: string | null
  enrolled_at: string | null
  waiting_until: string | null
  next_step_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  steps_completed: number
  step_total: number
  subject: PlaybookEnrolmentSubject
  created_at: string
  updated_at: string
}

export interface PlaybookEnrolment {
  id: number
  automationId: number
  playbookId: number | null
  status: string
  cancelCause: string | null
  enrolledAt: string | null
  waitingUntil: string | null
  nextStepAt: string | null
  completedAt: string | null
  durationSeconds: number | null
  stepsCompleted: number
  stepTotal: number
  subject: PlaybookEnrolmentSubject
  createdAt: string
  updatedAt: string
}

export interface ActivePlaybookEnrolment {
  playbook_id: number
  run_id: number
  automation_id: number
  step_index: number
  step_total: number
  waiting_until: string | null
  status: string
}

export function normalizePlaybookStep(api: ApiPlaybookStep): PlaybookStep {
  return {
    id: api.id,
    offsetDays: api.offset_days,
    action: api.action,
    params: api.params ?? {},
    sort: api.sort
  }
}

export function normalizePlaybook(api: ApiPlaybook): Playbook {
  return {
    id: api.id,
    kind: api.kind,
    name: api.name,
    isActive: api.is_active,
    enrolmentFilters: api.enrolment_filters ?? {},
    automationId: api.automation_id,
    archivedAt: api.archived_at,
    activeEnrolmentCount: api.active_enrolment_count ?? null,
    steps: (api.steps ?? []).map(normalizePlaybookStep),
    createdAt: api.created_at,
    updatedAt: api.updated_at
  }
}

export function normalizeEnrolment(api: ApiPlaybookEnrolment): PlaybookEnrolment {
  return {
    id: api.id,
    automationId: api.automation_id,
    playbookId: api.playbook_id,
    status: api.status,
    cancelCause: api.cancel_cause,
    enrolledAt: api.enrolled_at,
    waitingUntil: api.waiting_until,
    nextStepAt: api.next_step_at,
    completedAt: api.completed_at,
    durationSeconds: api.duration_seconds,
    stepsCompleted: api.steps_completed,
    stepTotal: api.step_total,
    subject: api.subject,
    createdAt: api.created_at,
    updatedAt: api.updated_at
  }
}

export function serializeSteps(steps: Array<PlaybookStep>): Array<{
  offset_days: number
  action: PlaybookStepAction
  params: PlaybookStepParams
  sort: number
}> {
  return steps.map((step, index) => ({
    offset_days: step.offsetDays,
    action: step.action,
    params: step.params,
    sort: index
  }))
}
