export type AgentChannel = 'email' | 'sms' | 'whatsapp' | 'webchat' | 'voice'

export type VerificationLevel = 'anonymous' | 'channel_asserted' | 'verified'

export type ConversationState = 'active' | 'awaiting_human' | 'handed_off' | 'closed'

export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type ToolInvocationStatus = 'ok' | 'denied' | 'not_found' | 'error'

export type ToolDeniedReason
  = 'verification'
    | 'ownership'
    | 'not_allowed_for_agent'
    | 'site_scope'
    | 'quota_exceeded'
    | 'requires_approval'
    | 'unlicensed_argument'

export type BindingMode = 'off' | 'draft' | 'auto'

export type BindingAudience = 'known_contacts' | 'existing_tenants' | 'all'

export type OutsideHoursPolicy = 'inbox' | 'answer'

export type PromotionMethod = 'otp' | 'contact_created'

export const BINDING_MODES: Array<BindingMode> = ['off', 'draft', 'auto']

export const BINDING_AUDIENCES: Array<BindingAudience> = [
  'known_contacts',
  'existing_tenants',
  'all'
]

export const OUTSIDE_HOURS_POLICIES: Array<OutsideHoursPolicy> = ['inbox', 'answer']

export type HandoffReason
  = 'legal_or_complaint'
    | 'delinquency'
    | 'price_negotiation'
    | 'verification_required'
    | 'unsupported_intent'
    | 'grounding_failure'
    | 'repeated_failure'
    | 'customer_requested'
    | 'out_of_hours'
    | 'budget_exceeded'
    | 'turn_limit'
    | 'error'

export type HandoffTriggerSource = 'rule' | 'model' | 'customer' | 'guardrail'

export type GuardKey = 'duplicate_draft' | 'grounding' | 'forbidden_claim' | 'disclosure' | 'channel'

export type GuardVerdict = 'pass' | 'warn' | 'deny' | 'block' | 'handoff'

export type AgentReplyLocale = 'en' | 'es' | 'fr'

export const AGENT_CHANNELS: Array<AgentChannel> = ['email', 'sms', 'whatsapp', 'webchat', 'voice']

export const VERIFICATION_LEVELS: Array<VerificationLevel> = ['anonymous', 'channel_asserted', 'verified']

export const AGENT_REPLY_LOCALES: Array<AgentReplyLocale> = ['en', 'es', 'fr']

export const SMS_MAX_CHARACTERS = 1600

export type WriteMode = 'off' | 'propose' | 'commit'

export type PendingActionStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'superseded'

export const WRITE_MODES: Array<WriteMode> = ['off', 'propose', 'commit']

export const PENDING_ACTION_STATUSES: Array<PendingActionStatus> = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'superseded'
]

export interface AgentWriteTool {
  key: string
  required_verification: VerificationLevel
  proposable: boolean
  mode: WriteMode
  max_per_conversation: number | null
  max_per_day: number | null
  min_verification: VerificationLevel | null
}

export interface AgentWritePolicyPayload {
  tool_key: string
  mode: WriteMode
  max_per_conversation: number | null
  max_per_day: number | null
  min_verification: VerificationLevel | null
}

export interface AgentPendingContact {
  id: number
  first_name: string
  last_name: string | null
}

export interface AgentPendingAgent {
  id: number
  key: string
  name: string
}

export interface AgentOfferPreviewLine {
  label?: string
  display: string
  net?: string
  tax?: string
  gross?: string
  currency?: string
  rate?: string
}

export interface AgentPendingAction {
  id: number
  agent_conversation_id: number
  agent_tool_invocation_id: number
  ai_agent_id: number
  site_id: number
  tool_key: string
  payload: Record<string, unknown>
  preview: Record<string, unknown> | null
  status: PendingActionStatus
  resolved_by_employee_id: number | null
  resolved_at: string | null
  rejection_reason: string | null
  result_type: string | null
  result_id: number | null
  failure_reason: string | null
  expires_at: string
  created_at: string | null
  agent?: AgentPendingAgent | null
  conversation?: AgentConversation | null
  invocation?: AgentToolInvocation | null
}

export interface AgentPendingBadge {
  pending: number
}

export interface AiAgent {
  id: number
  key: string
  name: string
  description: string | null
  model: string
  write_tools?: Array<AgentWriteTool>
}

export interface AiAgentsListResponse {
  message: string
  data: Array<AiAgent>
  meta: {
    demo_enabled: boolean
  }
}

export interface AgentChannelBindingAgent {
  id: number
  key: string
  name: string
}

export interface AgentChannelBindingSite {
  id: number
  name: string
}

export interface AgentChannelBindingUpdatedBy {
  id: number
  name: string
}

export interface AgentChannelBinding {
  id: number
  ai_agent_id: number
  agent: AgentChannelBindingAgent
  channel: AgentChannel
  site_id: number | null
  site: AgentChannelBindingSite | null
  mode: BindingMode
  audience: BindingAudience
  outside_hours: OutsideHoursPolicy
  allowed_tools: Array<string>
  archived_at: string | null
  updated_by: AgentChannelBindingUpdatedBy | null
  updated_at: string | null
}

export interface AgentChannelBindingsListResponse {
  message: string
  data: Array<AgentChannelBinding>
}

export interface AiDemoPersonaSite {
  id: number
  name: string
}

export interface AiDemoPersona {
  id: number
  name: string
  first_name: string
  last_name: string
  site_id: number | null
  site: AiDemoPersonaSite | null
  has_contract: boolean
  has_balance: boolean
  has_delinquency: boolean
}

export interface AgentConversationMessage {
  id: number
  sequence: number
  role: AgentMessageRole
  content: string | null
  tool_calls: unknown
  tool_call_id: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  latency_ms: number | null
  finish_reason: string | null
  blocked_by: string | null
  subject: string | null
  fact_keys: Array<string> | null
  created_at: string | null
}

export interface AgentToolInvocation {
  id: number
  tool_key: string
  arguments: Record<string, unknown> | null
  result: unknown
  result_summary: string | null
  status: ToolInvocationStatus
  denied_reason: ToolDeniedReason | null
  duration_ms: number | null
  pending_action_id?: number | null
  created_at: string | null
}

export interface AgentHandoff {
  id: number
  reason: HandoffReason
  trigger_source: HandoffTriggerSource
  detail: unknown
  created_at: string | null
}

export interface AgentConversation {
  id: number
  ai_agent_id: number
  agent_key: string | null
  audience: string
  origin: string
  channel: AgentChannel | string
  contact_id: number | null
  contact?: AgentPendingContact | null
  site_id: number | null
  verification_level: VerificationLevel | string
  state: ConversationState
  locale: string
  last_turn_at: string | null
  closed_at: string | null
  created_at: string | null
  messages?: Array<AgentConversationMessage>
  tool_invocations?: Array<AgentToolInvocation>
  handoffs?: Array<AgentHandoff>
  trace?: Array<AgentTraceEntry>
}

export interface AgentTraceEnvelope {
  conversation_id?: number | null
  turn?: number | null
  seq?: number | null
  message_id?: number | null
  model?: string | null
  prompt_version?: string | null
  occurred_at?: string | null
}

export interface AgentEntityRef {
  type: string
  id: number
  label: string
  context?: string | null
}

export interface AgentToolRecovery {
  tool: string
  hint: string
}

export type AgentStreamEvent
  = {
    event: 'turn.started'
    data: AgentTraceEnvelope & { sequence: number }
  }
  | {
    event: 'token'
    data: { delta: string }
  }
  | {
    event: 'tool.started'
    data: AgentTraceEnvelope & {
      tool_key: string
      arguments: Record<string, unknown>
    }
  }
  | {
    event: 'tool.finished'
    data: AgentTraceEnvelope & {
      tool_key: string
      status: ToolInvocationStatus
      denied_reason?: string | null
      duration_ms: number
      result_summary: string
      invocation_id?: number
      pending_action_id?: number | null
      replayed?: boolean
      entities?: Array<AgentEntityRef>
      error_code?: string | null
      recovery?: AgentToolRecovery | null
    }
  }
  | {
    event: 'guardrail'
    data: AgentTraceEnvelope & {
      guard: string
      verdict: GuardVerdict
      detail?: unknown
    }
  }
  | {
    event: 'handoff'
    data: AgentTraceEnvelope & {
      reason: string
      trigger_source: string
      detail: unknown
    }
  }
  | {
    event: 'usage'
    data: AgentTraceEnvelope & {
      input_tokens: number
      output_tokens: number
      cached_input_tokens?: number | null
      estimated_cost: string | null
      currency: string | null
    }
  }
  | {
    event: 'turn.completed'
    data: {
      message_id: number | null
      blocked_by: string | null
      state: ConversationState
      subject: string | null
    }
  }
  | {
    event: 'error'
    data: { message: string }
  }

export const AGENT_STREAM_EVENT_NAMES = [
  'turn.started',
  'token',
  'tool.started',
  'tool.finished',
  'guardrail',
  'handoff',
  'usage',
  'turn.completed',
  'error'
] as const

export type AgentStreamEventName = typeof AGENT_STREAM_EVENT_NAMES[number]

export interface DemoMessageChannel {
  detail: ChannelGuardDetail
  verdict: GuardVerdict
  redrafted: boolean
  originalBody: string | null
}

export interface DemoChatMessage {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  subject: string | null
  blockedBy: string | null
  streaming: boolean
  consultingToolKey: string | null
  originalBody: string | null
  channel: DemoMessageChannel | null
}

export interface ChannelGuardDetail {
  segments?: number
  encoding?: string
  gsm7_transliterated?: boolean
  max_segments?: number
  reason?: string
  advisory?: boolean
  outside_window_mode?: string
  inside_window_mode?: string
  requires_template_outside_window?: boolean
  html_stripped?: boolean
  missing_subject?: boolean
}

export type AgentTraceToolEntry = AgentTraceEnvelope & {
  kind: 'tool'
  id: string
  tool_key: string
  arguments: Record<string, unknown>
  status?: ToolInvocationStatus
  denied_reason?: string | null
  duration_ms?: number
  result_summary?: string
  result?: unknown
  invocation_id?: number
  pending_action_id?: number | null
  replayed?: boolean
  entities?: Array<AgentEntityRef>
  error_code?: string | null
  recovery?: AgentToolRecovery | null
}

export type AgentTraceGuardrailEntry = AgentTraceEnvelope & {
  kind: 'guardrail'
  id: string
  guard: string
  verdict: GuardVerdict
  detail?: unknown
}

export type AgentTraceHandoffEntry = AgentTraceEnvelope & {
  kind: 'handoff'
  id: string
  reason: string
  trigger_source: string
  detail: unknown
}

export type AgentTraceUsageEntry = AgentTraceEnvelope & {
  kind: 'usage'
  id: string
  input_tokens: number
  output_tokens: number
  cached_input_tokens?: number | null
  estimated_cost: string | null
  currency: string | null
}

export type AgentTracePromotionEntry = AgentTraceEnvelope & {
  kind: 'promotion'
  id: string
  from: VerificationLevel | string
  to: VerificationLevel | string
  method: PromotionMethod | string
}

export type AgentTraceEntry
  = AgentTraceToolEntry
    | AgentTraceGuardrailEntry
    | AgentTraceHandoffEntry
    | AgentTraceUsageEntry
    | AgentTracePromotionEntry

export interface AgentCostTotal {
  currency: string
  estimated_cost: string
}

export interface AgentTraceTotals {
  turns: number
  inputTokens: number
  outputTokens: number
  toolCalls: number
  blocks: number
  costs: Array<AgentCostTotal>
  uncostedInputTokens: number
  uncostedOutputTokens: number
}

export function previewString(
  preview: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = preview?.[key]
  return typeof value === 'string' && value !== '' ? value : null
}

export function previewNumber(
  preview: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  const value = preview?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function previewOfferLines(
  preview: Record<string, unknown> | null | undefined
): Array<AgentOfferPreviewLine> {
  const lines = preview?.lines
  if (!Array.isArray(lines)) {
    return []
  }

  const result: Array<AgentOfferPreviewLine> = []
  for (const row of lines) {
    if (row === null || typeof row !== 'object' || !('display' in row)) {
      continue
    }
    const display = (row as { display: unknown }).display
    if (typeof display !== 'string' || display === '') {
      continue
    }
    result.push(row as AgentOfferPreviewLine)
  }
  return result
}

export function pendingResultPath(action: Pick<AgentPendingAction, 'result_type' | 'result_id'>): string | null {
  if (action.result_id == null || action.result_type == null) {
    return null
  }
  if (action.result_type === 'offer') {
    return `/leasing/offers/${action.result_id}`
  }
  if (action.result_type === 'reservation') {
    return `/leasing/reservations/${action.result_id}`
  }
  return null
}

export function minutesUntil(iso: string): number {
  const then = new Date(iso.replace(' ', 'T')).getTime()
  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY
  }
  return (then - Date.now()) / (1000 * 60)
}
