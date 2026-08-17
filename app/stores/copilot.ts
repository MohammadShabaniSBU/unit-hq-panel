import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CopilotConversation,
  CopilotConversationSummary,
  CopilotDispatchResponse,
  CopilotMessage,
  CopilotPendingApproval,
  CopilotStoredMessage,
  CopilotStreamEvent,
  CopilotStreamStatus,
  TextPart,
  ToolCallPart
} from '~/types/copilot'

import { emitCopilotTurn } from '~/utils/copilotTurnBus'

export type { TextPart, ToolCallPart, CopilotMessage, CopilotConversation }

const voiceBuffer = ref('')

const generateId = (): string => {
  return 'id_' + Math.random().toString(36).substr(2, 9)
}

function getMessageText(message: CopilotMessage): string {
  return message.parts.find(part => part.type === 'text')?.text ?? ''
}

function mapStoredMessage(message: CopilotStoredMessage): CopilotMessage {
  const parts: Array<TextPart | ToolCallPart> = []

  if (message.content) {
    parts.push({ type: 'text', text: message.content })
  }

  const toolCalls = message.tool_calls ?? []
  const toolResults = message.tool_results ?? []

  for (const call of toolCalls) {
    const toolCallId = String(call.id ?? call.toolCallId ?? '')
    const toolName = String(call.name ?? call.toolName ?? '')
    const matchingResult = toolResults.find(result => String(result.id ?? '') === toolCallId)
    let result: Record<string, unknown> | undefined

    if (matchingResult) {
      const raw = matchingResult.result ?? matchingResult.output ?? matchingResult
      if (typeof raw === 'string') {
        try {
          result = JSON.parse(raw) as Record<string, unknown>
        } catch {
          result = { output: raw }
        }
      } else if (raw && typeof raw === 'object') {
        result = raw as Record<string, unknown>
      }
    }

    parts.push({
      type: 'tool-call',
      toolCallId,
      toolName,
      status: matchingResult ? 'done' : 'calling',
      result
    })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: '' })
  }

  return {
    id: message.id,
    role: message.role,
    parts
  }
}

export const useCopilotStore = defineStore('copilot', () => {
  const isOpen = ref(false)
  const conversations = ref<Array<CopilotConversation>>([])
  const activeConversationId = ref<string | null>(null)
  const status = ref<CopilotStreamStatus>('ready')
  const isLoading = ref(false)
  const pendingApprovals = ref<Array<CopilotPendingApproval>>([])
  // Decisions the operator has made locally but not yet submitted — a resume
  // resolves EVERY currently-pending tool call in one pass, so submitting
  // before every pending approval has a decision would silently reject
  // whichever ones aren't included. See app/Http/Controllers/CopilotController.php.
  const decidedApprovals = ref<Record<string, { action: 'approve' | 'reject', result?: string }>>({})
  const streamError = ref<string | null>(null)
  const streamingAssistantId = ref<string | null>(null)
  const voiceTurnPending = ref(false)

  const toggle = () => {
    isOpen.value = !isOpen.value
  }
  const open = () => {
    isOpen.value = true
  }
  const close = () => {
    isOpen.value = false
  }

  const activeConversation = computed(() => {
    if (!activeConversationId.value) return null
    return conversations.value.find(c => c.id === activeConversationId.value) ?? null
  })

  const activeMessages = computed(() => activeConversation.value?.messages ?? [])

  const isBusy = computed(() =>
    status.value === 'submitted'
    || status.value === 'streaming'
    || status.value === 'awaiting_approval'
  )

  async function fetchConversations() {
    isLoading.value = true
    try {
      const { getPaginated } = useApi()
      const res = await getPaginated<CopilotConversationSummary>('/api/copilot/conversations')
      conversations.value = res.data.map(c => ({
        id: c.id,
        title: c.title,
        messages: [],
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }))
    } catch (e) {
      console.error('Failed to fetch conversations', e)
    } finally {
      isLoading.value = false
    }
  }

  async function newConversation() {
    isLoading.value = true
    try {
      const { post } = useApi()
      const res = await post<CopilotConversationSummary>('/api/copilot/conversations', {})
      const conversation: CopilotConversation = {
        id: res.data.id,
        title: res.data.title,
        messages: [],
        createdAt: res.data.created_at,
        updatedAt: res.data.updated_at
      }
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
    } catch (e) {
      console.error('Failed to create conversation', e)
    } finally {
      isLoading.value = false
    }
  }

  async function selectConversation(id: string) {
    activeConversationId.value = id
    pendingApprovals.value = []
    decidedApprovals.value = {}
    streamError.value = null
    streamingAssistantId.value = null
    status.value = 'ready'

    const conv = conversations.value.find(c => c.id === id)
    if (!conv) return

    isLoading.value = true
    try {
      const { getPaginated } = useApi()
      const res = await getPaginated<CopilotStoredMessage>(`/api/copilot/conversations/${id}`)
      conv.messages = res.data.map(mapStoredMessage)
    } catch (e) {
      console.error('Failed to load conversation messages', e)
    } finally {
      isLoading.value = false
    }
  }

  async function reloadActiveConversation() {
    const id = activeConversationId.value
    if (!id) return

    try {
      const { getPaginated } = useApi()
      const res = await getPaginated<CopilotStoredMessage>(`/api/copilot/conversations/${id}`)
      const conv = conversations.value.find(c => c.id === id)
      if (conv) {
        conv.messages = res.data.map(mapStoredMessage)
      }
    } catch (e) {
      console.error('Failed to reload conversation after reconnect', e)
    }
  }

  function updateConversationTitle() {
    const conv = activeConversation.value
    if (!conv || conv.messages.length === 0) return
    const firstUser = conv.messages.find(m => m.role === 'user')
    if (firstUser) {
      const text = getMessageText(firstUser)
      conv.title = text.length > 50 ? text.substring(0, 50) + '...' : text
    }
  }

  function ensureStreamingAssistant(): CopilotMessage | null {
    const conv = activeConversation.value
    if (!conv) return null

    if (streamingAssistantId.value) {
      const existing = conv.messages.find(m => m.id === streamingAssistantId.value)
      if (existing) return existing
    }

    const last = conv.messages[conv.messages.length - 1]
    if (last?.role === 'assistant') {
      streamingAssistantId.value = last.id
      return last
    }

    const assistantMessage: CopilotMessage = {
      id: generateId(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }]
    }
    conv.messages.push(assistantMessage)
    streamingAssistantId.value = assistantMessage.id
    return assistantMessage
  }

  function applyStreamEvent(event: CopilotStreamEvent) {
    switch (event.type) {
      case 'stream_start': {
        status.value = 'streaming'
        streamError.value = null
        voiceBuffer.value = ''
        emitCopilotTurn({ type: 'started' })
        ensureStreamingAssistant()
        break
      }
      case 'text_delta': {
        status.value = 'streaming'
        voiceBuffer.value += event.delta
        emitCopilotTurn({ type: 'text', delta: event.delta })
        const msg = ensureStreamingAssistant()
        if (!msg) return
        let textPart = msg.parts.find(p => p.type === 'text') as TextPart | undefined
        if (!textPart) {
          textPart = { type: 'text', text: '' }
          msg.parts.unshift(textPart)
        }
        textPart.text += event.delta
        break
      }
      case 'text_end': {
        break
      }
      case 'stream_end': {
        // A turn that pauses for approval ends the stream too (the SDK
        // always emits a final stream_end once its generator completes,
        // whether that's a normal finish or a tool_approval_request pause —
        // they arrive in that order in the same turn). If tool_approval_request
        // just populated pendingApprovals, this stream_end belongs to that
        // pause, not a real completion — don't wipe the approval UI or
        // reload, since there's nothing new to fetch until the operator decides.
        streamingAssistantId.value = null
        if (pendingApprovals.value.length === 0) {
          emitCopilotTurn({ type: 'settled', text: voiceBuffer.value })
          status.value = 'ready'
          void reloadActiveConversation()
        }
        break
      }
      case 'tool_approval_request': {
        decidedApprovals.value = {}
        pendingApprovals.value = event.approvals.map(a => ({
          id: a.id,
          tool: a.tool,
          arguments: a.arguments ?? {},
          reason: a.reason ?? null
        }))
        status.value = 'awaiting_approval'
        emitCopilotTurn({ type: 'paused_for_approval', text: voiceBuffer.value })
        break
      }
      case 'copilot.tool_invoking': {
        status.value = 'streaming'
        const msg = ensureStreamingAssistant()
        if (!msg) return
        const existing = msg.parts.find(
          p => p.type === 'tool-call' && p.toolCallId === event.call_id
        )
        if (!existing) {
          msg.parts.push({
            type: 'tool-call',
            toolCallId: event.call_id,
            toolName: event.tool_name,
            status: 'calling'
          })
        }
        break
      }
      case 'stream_failed':
      case 'copilot.failed': {
        pendingApprovals.value = []
        decidedApprovals.value = {}
        streamingAssistantId.value = null
        streamError.value = event.type === 'copilot.failed'
          ? event.error_key
          : 'copilot.stream.failed'
        status.value = 'error'
        emitCopilotTurn({
          type: 'failed',
          errorKey: streamError.value
        })
        break
      }
    }
  }

  async function sendMessage(content: string, opts?: { source?: 'text' | 'voice', clientMessageId?: string }) {
    if (!content.trim()) return

    if (!activeConversation.value) {
      await newConversation()
    }

    if (!activeConversation.value) return

    const conversationId = activeConversation.value.id
    const source = opts?.source ?? 'text'
    const clientMessageId = opts?.clientMessageId ?? crypto.randomUUID()

    const userMessage: CopilotMessage = {
      id: generateId(),
      role: 'user',
      parts: [{ type: 'text', text: content }],
      source
    }
    activeConversation.value.messages.push(userMessage)
    updateConversationTitle()

    const assistantMessage: CopilotMessage = {
      id: generateId(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }]
    }
    activeConversation.value.messages.push(assistantMessage)
    streamingAssistantId.value = assistantMessage.id
    pendingApprovals.value = []
    decidedApprovals.value = {}
    streamError.value = null
    status.value = 'submitted'

    try {
      const { post } = useApi()
      await post<CopilotDispatchResponse>(
        `/api/copilot/conversations/${conversationId}/messages`,
        {
          message: content,
          client_message_id: clientMessageId,
          source
        }
      )
      if (status.value === 'submitted') {
        status.value = 'streaming'
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      streamError.value = 'copilot.stream.failed'
      status.value = 'error'
      emitCopilotTurn({ type: 'failed', errorKey: 'copilot.stream.failed' })
    }
  }

  async function submitDecisions(
    decisions: Record<string, { action: 'approve' | 'reject', result?: string }>
  ) {
    const conversationId = activeConversationId.value
    if (!conversationId) return

    pendingApprovals.value = []
    decidedApprovals.value = {}
    status.value = 'streaming'

    try {
      const { post } = useApi()
      await post<CopilotDispatchResponse>(
        `/api/copilot/conversations/${conversationId}/decisions`,
        {
          decisions,
          source: voiceTurnPending.value ? 'voice' : 'text'
        }
      )
    } catch (error) {
      console.error('Failed to submit decisions:', error)
      streamError.value = 'copilot.stream.failed'
      status.value = 'error'
      emitCopilotTurn({ type: 'failed', errorKey: 'copilot.stream.failed' })
    }
  }

  function approveAllPending() {
    if (pendingApprovals.value.length === 0) return
    const decisions: Record<string, { action: 'approve' | 'reject', result?: string }> = {}
    for (const approval of pendingApprovals.value) {
      decisions[approval.id] = { action: 'approve' }
    }
    return submitDecisions(decisions)
  }

  function rejectAllPending() {
    if (pendingApprovals.value.length === 0) return
    const decisions: Record<string, { action: 'approve' | 'reject', result?: string }> = {}
    for (const approval of pendingApprovals.value) {
      decisions[approval.id] = { action: 'reject' }
    }
    return submitDecisions(decisions)
  }

  // A resume resolves every currently-pending tool call in one pass (the
  // backend has no concept of "leave the rest pending") — so an individual
  // approve/reject click only submits once every pending approval has a
  // recorded decision. With a single pending approval this submits
  // immediately, same as before.
  function recordDecision(id: string, action: 'approve' | 'reject', result?: string) {
    decidedApprovals.value = {
      ...decidedApprovals.value,
      [id]: { action, ...(result ? { result } : {}) }
    }

    const pendingIds = pendingApprovals.value.map(a => a.id)
    const isComplete = pendingIds.length > 0
      && pendingIds.every(pendingId => pendingId in decidedApprovals.value)

    if (isComplete) {
      return submitDecisions(decidedApprovals.value)
    }
  }

  function rejectPending(id: string, result?: string) {
    return recordDecision(id, 'reject', result)
  }

  function approvePending(id: string) {
    return recordDecision(id, 'approve')
  }

  function registerShortcut() {
    if (!import.meta.client) return

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const isShortcutKey = isMac ? e.metaKey : e.ctrlKey

      if (isShortcutKey && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        toggle()
      }
    })
  }

  function reset() {
    isOpen.value = false
    conversations.value = []
    activeConversationId.value = null
    status.value = 'ready'
    isLoading.value = false
    pendingApprovals.value = []
    decidedApprovals.value = {}
    streamError.value = null
    streamingAssistantId.value = null
    voiceTurnPending.value = false
  }

  return {
    isOpen,
    conversations,
    activeConversationId,
    status,
    isBusy,
    isLoading,
    pendingApprovals,
    decidedApprovals,
    streamError,
    voiceTurnPending,
    activeConversation,
    activeMessages,
    toggle,
    open,
    close,
    fetchConversations,
    newConversation,
    selectConversation,
    reloadActiveConversation,
    sendMessage,
    applyStreamEvent,
    submitDecisions,
    approvePending,
    approveAllPending,
    rejectPending,
    rejectAllPending,
    registerShortcut,
    reset
  }
})
