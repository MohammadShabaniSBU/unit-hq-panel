export type TextPart = {
  type: 'text'
  text: string
}

export type ToolCallPart = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  status: 'calling' | 'done' | 'error'
  result?: Record<string, unknown>
}

export type CopilotMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: Array<TextPart | ToolCallPart>
}

export type CopilotConversation = {
  id: string
  title: string
  messages: Array<CopilotMessage>
  createdAt: string
  updatedAt?: string
}

export type CopilotConversationSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type CopilotStoredMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls?: Array<Record<string, unknown>> | null
  tool_results?: Array<Record<string, unknown>> | null
}

export type CopilotDispatchResponse = {
  call_id: string
  conversation_id: string
  channel: string
}

export type CopilotPendingApproval = {
  id: string
  tool: string
  arguments: Record<string, unknown>
  reason: string | null
}

export type CopilotStreamStatus = 'ready' | 'submitted' | 'streaming' | 'awaiting_approval' | 'error'

/** Broadcast event payloads from laravel/ai + app custom events. */
export type CopilotStreamEvent =
  | {
    type: 'stream_start'
    id: string
    invocation_id?: string
    timestamp: number
  }
  | {
    type: 'text_delta'
    id: string
    invocation_id?: string
    message_id: string
    delta: string
    timestamp: number
  }
  | {
    type: 'text_end'
    id: string
    invocation_id?: string
    message_id?: string
    timestamp: number
  }
  | {
    type: 'stream_end'
    id: string
    invocation_id?: string
    timestamp: number
  }
  | {
    type: 'tool_approval_request'
    id: string
    invocation_id?: string
    approvals: Array<CopilotPendingApproval>
    timestamp: number
  }
  | {
    type: 'stream_failed'
    id: string
    invocation_id?: string
    message: string
    recoverable: boolean
    timestamp: number
  }
  | {
    type: 'copilot.failed'
    error_key: string
    call_id: string
    conversation_id: string
  }
  | {
    type: 'copilot.tool_invoking'
    tool_name: string
    call_id: string
  }
