import type { EmailDocumentV2 } from './email-block-document'
import type { StoredTurnOp } from '../utils/assistApply'

export const ASSIST_MAX_PROMPT_CHARS = 4000

export type AssistTurnStatus
  = 'running'
    | 'completed'
    | 'failed'
    | 'applied'
    | 'undone'
    | 'conflict'
    | 'discarded'

export type AssistReportStatus = 'applied' | 'conflict' | 'discarded' | 'undone'

export interface AssistOpSummary {
  added: number
  edited: number
  removed: number
  moved?: number
  sections_added?: number
}

export interface AssistSubjectChange {
  from: string | null
  to: string
}

export interface AssistMessage {
  id: string
  role: string
  content: string
  created_at?: string
}

export interface AssistTurnSummary {
  id: number
  status: AssistTurnStatus
  op_summary: AssistOpSummary | null
  subject_change: AssistSubjectChange | null
  error_key: string | null
  created_at?: string
}

export interface AssistSession {
  id: number
  template_family_id: number
  locale: string
  conversation_id: string
  messages: Array<AssistMessage>
  turns: Array<AssistTurnSummary>
}

export interface AssistTurnDetail {
  status: AssistTurnStatus
  base_hash: string
  ops: Array<StoredTurnOp>
  working_document: EmailDocumentV2
  subject_change: AssistSubjectChange | null
  op_summary: AssistOpSummary | null
  error_key: string | null
}

export interface AssistDispatch {
  call_id: string
  turn_id: number
  session_id: number
  channel: string
}

export interface AssistFinished {
  turnId: number
  status: string
  nonce: number
}
