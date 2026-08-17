export type AgentChannel = 'email' | 'sms' | 'whatsapp' | 'webchat'

export type VerificationLevel = 'anonymous' | 'channel_asserted' | 'verified'

export type ConversationState = 'active' | 'awaiting_human' | 'handed_off' | 'closed'

export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type ToolInvocationStatus = 'ok' | 'denied' | 'not_found' | 'error'

export type ToolDeniedReason = 'verification' | 'ownership' | 'not_allowed_for_agent' | 'site_scope'

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

export type GuardVerdict = 'pass' | 'block' | 'retry'

export type AgentReplyLocale = 'en' | 'es' | 'fr'

export const AGENT_CHANNELS: Array<AgentChannel> = ['email', 'sms', 'whatsapp', 'webchat']

export const VERIFICATION_LEVELS: Array<VerificationLevel> = ['anonymous', 'channel_asserted', 'verified']

export const AGENT_REPLY_LOCALES: Array<AgentReplyLocale> = ['en', 'es', 'fr']

export const SMS_MAX_CHARACTERS = 1600

export interface AiAgent {
  id: number
  key: string
  name: string
  description: string | null
  model: string
}

export interface AiAgentsListResponse {
  message: string
  data: Array<AiAgent>
  meta: {
    demo_enabled: boolean
  }
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
}

export type AgentStreamEvent
  = {
    event: 'turn.started'
    data: { sequence: number }
  }
  | {
    event: 'token'
    data: { delta: string }
  }
  | {
    event: 'tool.started'
    data: {
      tool_key: string
      arguments: Record<string, unknown>
    }
  }
  | {
    event: 'tool.finished'
    data: {
      tool_key: string
      status: ToolInvocationStatus
      denied_reason?: string | null
      duration_ms: number
      result_summary: string
    }
  }
  | {
    event: 'guardrail'
    data: {
      guard: string
      verdict: GuardVerdict
      detail?: unknown
    }
  }
  | {
    event: 'handoff'
    data: {
      reason: string
      trigger_source: string
      detail: unknown
    }
  }
  | {
    event: 'usage'
    data: {
      input_tokens: number
      output_tokens: number
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

export interface DemoChatMessage {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  subject: string | null
  blockedBy: string | null
  streaming: boolean
  consultingToolKey: string | null
}

export interface ChannelGuardDetail {
  segments?: number
  encoding?: string
  advisory?: boolean
  outside_window_mode?: string
  inside_window_mode?: string
  requires_template_outside_window?: boolean
  html_stripped?: boolean
  missing_subject?: boolean
}

export type AgentTraceEntry
  = {
    kind: 'tool'
    id: string
    tool_key: string
    arguments: Record<string, unknown>
    status?: ToolInvocationStatus
    denied_reason?: string | null
    duration_ms?: number
    result_summary?: string
    result?: unknown
  }
  | {
    kind: 'guardrail'
    id: string
    guard: string
    verdict: GuardVerdict
    detail?: unknown
  }
  | {
    kind: 'handoff'
    id: string
    reason: string
    trigger_source: string
    detail: unknown
  }
  | {
    kind: 'usage'
    id: string
    input_tokens: number
    output_tokens: number
    estimated_cost: string | null
    currency: string | null
  }

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
