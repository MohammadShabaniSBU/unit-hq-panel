import type { AgentConversation, AgentConversationMessage, VerificationLevel } from '~/types/agents'

export interface VoiceSessionContact {
  id: number
  first_name: string
  last_name: string | null
}

export interface VoiceSessionSite {
  id: number
  name: string
}

export interface VoiceSessionTurn {
  id: number
  turn_id: string
  answer_text: string
  transfer: boolean
  destination: string | null
  latency_ms: number | null
  handoff_reason: string | null
  agent_conversation_message_id: number | null
}

export interface VoiceSession {
  id: number
  started_at: string | null
  ended_at: string | null
  caller_number: string | null
  contact_id: number | null
  contact?: VoiceSessionContact | null
  site_id: number
  site?: VoiceSessionSite | null
  delegated_span_seconds: number | null
  transfer_requested: boolean
  verification_level?: VerificationLevel | string
  conversation?: AgentConversation
  turns?: Array<VoiceSessionTurn>
}

export type VoiceTranscriptMessage = Pick<
  AgentConversationMessage,
  'id' | 'sequence' | 'role' | 'content' | 'blocked_by'
>
