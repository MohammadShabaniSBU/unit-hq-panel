import type {
  AgentChannel,
  AgentConversation,
  AgentConversationMessage,
  AgentReplyLocale,
  AgentStreamEvent,
  AgentTraceEntry,
  AgentTraceTotals,
  ConversationState,
  DemoChatMessage,
  VerificationLevel
} from '~/types/agents'
import { assertNever } from '~/utils/assertNever'
import { isDemoDisabledError } from '~/utils/demoDisabled'
import { AgentStreamError } from '~/composables/useAgentStream'
import {
  applyChannelMeta,
  collectOriginalBodies,
  deriveChannelMeta,
  envelopeFrom,
  mapTraceRows,
  maxTurn,
  unwrapChannelDetail
} from '~/utils/agentTrace'

let traceSeq = 0

function nextTraceId(): string {
  traceSeq += 1
  return `trace-${traceSeq}`
}

function isReplyLocale(value: string): value is AgentReplyLocale {
  return value === 'en' || value === 'es' || value === 'fr'
}

function displayMessagesFromApi(rows: Array<AgentConversationMessage>): Array<DemoChatMessage> {
  return rows
    .filter((row): row is AgentConversationMessage & { role: 'user' | 'assistant' } => {
      return row.role === 'user' || row.role === 'assistant'
    })
    .map(row => ({
      id: row.id,
      role: row.role,
      content: row.content ?? '',
      subject: row.subject,
      blockedBy: row.blocked_by,
      streaming: false,
      consultingToolKey: null,
      originalBody: null,
      channel: null
    }))
}

function addCost(
  costs: Map<string, string>,
  currency: string,
  amount: string
): void {
  const current = costs.get(currency) ?? '0'
  const sum = Number.parseFloat(current) + Number.parseFloat(amount)
  costs.set(currency, Number.isNaN(sum) ? amount : sum.toFixed(6))
}

export function useAgentChat() {
  const { get, post } = useApi()
  const { stream, cancel, streaming } = useAgentStream()
  const { locale: uiLocale } = useI18n()
  const toast = useToast()
  const { t } = useI18n()

  const agentKey = ref<string | null>(null)
  const channel = ref<AgentChannel>('sms')
  const personaId = ref<number | null>(null)
  const verificationLevel = ref<VerificationLevel>('anonymous')
  const siteId = ref<number | null>(null)
  const replyLocale = ref<AgentReplyLocale>(
    isReplyLocale(uiLocale.value) ? uiLocale.value : 'en'
  )

  const conversation = ref<AgentConversation | null>(null)
  const messages = ref<Array<DemoChatMessage>>([])
  const trace = ref<Array<AgentTraceEntry>>([])
  const state = ref<ConversationState>('active')
  const lastHandoff = ref<{
    reason: string
    trigger_source: string
    detail: unknown
  } | null>(null)
  const sending = ref(false)
  const demoDisabled = ref(false)
  const composer = ref('')
  const turnCount = ref(0)
  const confirmOpen = ref(false)

  let pendingApply: (() => void) | null = null
  let inFlightId: string | number | null = null
  let liveTurn: number | null = null

  const hasTurns = computed(() => {
    return messages.value.some(message => message.role === 'user' || message.role === 'assistant')
  })

  const composerDisabled = computed(() => {
    return sending.value || streaming.value || state.value !== 'active' || demoDisabled.value
  })

  const totals = computed<AgentTraceTotals>(() => {
    const costs = new Map<string, string>()
    let inputTokens = 0
    let outputTokens = 0
    let uncostedInputTokens = 0
    let uncostedOutputTokens = 0
    let toolCalls = 0
    let blocks = 0

    for (const entry of trace.value) {
      if (entry.kind === 'usage') {
        inputTokens += entry.input_tokens
        outputTokens += entry.output_tokens
        if (entry.currency && entry.estimated_cost !== null) {
          addCost(costs, entry.currency, entry.estimated_cost)
        } else {
          uncostedInputTokens += entry.input_tokens
          uncostedOutputTokens += entry.output_tokens
        }
      } else if (entry.kind === 'tool' && entry.status) {
        toolCalls += 1
      } else if (entry.kind === 'guardrail' && entry.verdict === 'block') {
        blocks += 1
      }
    }

    return {
      turns: turnCount.value,
      inputTokens,
      outputTokens,
      toolCalls,
      blocks,
      costs: Array.from(costs.entries()).map(([currency, estimated_cost]) => ({
        currency,
        estimated_cost
      })),
      uncostedInputTokens,
      uncostedOutputTokens
    }
  })

  function propose(apply: () => void) {
    if (hasTurns.value) {
      pendingApply = apply
      confirmOpen.value = true
      return
    }

    apply()
    void discardCurrent()
  }

  function confirmSetupChange() {
    pendingApply?.()
    pendingApply = null
    confirmOpen.value = false
    void discardCurrent()
  }

  function cancelSetupChange() {
    pendingApply = null
    confirmOpen.value = false
  }

  function setAgentKey(value: string | null) {
    if (value === agentKey.value) {
      return
    }
    propose(() => {
      agentKey.value = value
    })
  }

  function setChannel(value: AgentChannel) {
    if (value === channel.value) {
      return
    }
    propose(() => {
      channel.value = value
    })
  }

  function setPersonaId(value: number | null, nextSiteId?: number | null) {
    if (value === personaId.value) {
      return
    }
    propose(() => {
      personaId.value = value
      if (nextSiteId !== undefined) {
        siteId.value = nextSiteId
      }
      if (value === null && verificationLevel.value === 'verified') {
        verificationLevel.value = 'anonymous'
      }
    })
  }

  function setVerificationLevel(value: VerificationLevel) {
    if (value === verificationLevel.value) {
      return
    }
    propose(() => {
      verificationLevel.value = value
    })
  }

  function setSiteId(value: number | null) {
    if (value === siteId.value) {
      return
    }
    propose(() => {
      siteId.value = value
    })
  }

  function setReplyLocale(value: AgentReplyLocale) {
    if (value === replyLocale.value) {
      return
    }
    propose(() => {
      replyLocale.value = value
    })
  }

  function clearSession() {
    cancel()
    conversation.value = null
    messages.value = []
    trace.value = []
    lastHandoff.value = null
    state.value = 'active'
    turnCount.value = 0
    composer.value = ''
    inFlightId = null
    liveTurn = null
    sending.value = false
  }

  async function closeConversation(id: number) {
    try {
      await post(`/api/agent-conversations/${id}/close`, {})
    } catch {
      // Closing is best-effort; the next create starts a new conversation either way.
    }
  }

  async function discardCurrent() {
    const current = conversation.value
    clearSession()
    if (current) {
      await closeConversation(current.id)
    }
  }

  async function reset(defaults?: { agentKey?: string | null }) {
    await discardCurrent()
    agentKey.value = defaults?.agentKey ?? agentKey.value
    channel.value = 'sms'
    personaId.value = null
    verificationLevel.value = 'anonymous'
    siteId.value = null
    replyLocale.value = isReplyLocale(uiLocale.value) ? uiLocale.value : 'en'
    demoDisabled.value = false
  }

  async function newConversation() {
    await discardCurrent()
    try {
      await createConversation()
    } catch (error) {
      handleCaught(error)
    }
  }

  async function createConversation(): Promise<AgentConversation> {
    if (!agentKey.value) {
      throw new Error('errors.agent.unknown_or_inactive')
    }

    const body: Record<string, unknown> = {
      agent_key: agentKey.value,
      channel: channel.value,
      origin: 'demo',
      verification_level: verificationLevel.value,
      locale: replyLocale.value
    }

    if (siteId.value !== null) {
      body.site_id = siteId.value
    }

    if (verificationLevel.value !== 'anonymous' && personaId.value !== null) {
      body.contact_id = personaId.value
    }

    const response = await post<AgentConversation>('/api/agent-conversations', body)
    conversation.value = response.data
    state.value = response.data.state
    return response.data
  }

  function inFlightMessage(): DemoChatMessage | undefined {
    if (inFlightId === null) {
      return undefined
    }

    return messages.value.find(message => message.id === inFlightId)
  }

  function applyInFlightChannelMeta(envelopeTurn: number | null) {
    const current = inFlightMessage()
    if (!current || current.role !== 'assistant') {
      return
    }

    current.channel = deriveChannelMeta(trace.value, {
      messageId: current.id,
      turn: envelopeTurn ?? liveTurn,
      originalBody: current.originalBody ?? current.channel?.originalBody ?? null
    })
  }

  function applyEvent(event: AgentStreamEvent) {
    switch (event.event) {
      case 'turn.started':
        liveTurn = event.data.turn ?? liveTurn
        break
      case 'token': {
        const current = inFlightMessage()
        if (current) {
          current.content += event.data.delta
        }
        break
      }
      case 'tool.started': {
        const envelope = envelopeFrom(event.data)
        liveTurn = envelope.turn ?? liveTurn
        const current = inFlightMessage()
        if (current) {
          current.consultingToolKey = event.data.tool_key
        }
        trace.value.push({
          kind: 'tool',
          id: nextTraceId(),
          ...envelope,
          tool_key: event.data.tool_key,
          arguments: event.data.arguments
        })
        break
      }
      case 'tool.finished': {
        const envelope = envelopeFrom(event.data)
        const current = inFlightMessage()
        if (current && current.consultingToolKey === event.data.tool_key) {
          current.consultingToolKey = null
        }
        const open = [...trace.value].reverse().find((entry) => {
          return entry.kind === 'tool'
            && entry.tool_key === event.data.tool_key
            && entry.status === undefined
        })
        if (open && open.kind === 'tool') {
          open.status = event.data.status
          open.denied_reason = event.data.denied_reason ?? null
          open.duration_ms = event.data.duration_ms
          open.result_summary = event.data.result_summary
          open.invocation_id = event.data.invocation_id
          open.pending_action_id = event.data.pending_action_id ?? null
          open.replayed = event.data.replayed ?? false
          open.entities = event.data.entities ?? []
          open.error_code = event.data.error_code ?? null
          open.recovery = event.data.recovery ?? null
          if (envelope.seq != null) {
            open.seq = envelope.seq
          }
          if (envelope.message_id != null) {
            open.message_id = envelope.message_id
          }
          if (envelope.model) {
            open.model = envelope.model
          }
          if (envelope.prompt_version) {
            open.prompt_version = envelope.prompt_version
          }
          if (envelope.occurred_at) {
            open.occurred_at = envelope.occurred_at
          }
        }
        break
      }
      case 'guardrail': {
        const envelope = envelopeFrom(event.data)
        liveTurn = envelope.turn ?? liveTurn
        trace.value.push({
          kind: 'guardrail',
          id: nextTraceId(),
          ...envelope,
          guard: event.data.guard,
          verdict: event.data.verdict,
          detail: event.data.detail
        })
        if (event.data.guard === 'channel') {
          const current = inFlightMessage()
          if (current && current.role === 'assistant') {
            const detail = unwrapChannelDetail(event.data.detail)
            // Client-only: persisting a second copy of customer-directed content
            // would land in agent_handoffs.detail, which AR-03 already flags as
            // outside contacts:redact. Do not "fix" this by storing original_body.
            if (
              detail?.gsm7_transliterated
              && current.originalBody == null
              && current.content !== ''
            ) {
              current.originalBody = current.content
            }
            applyInFlightChannelMeta(envelope.turn ?? null)
          }
        }
        break
      }
      case 'handoff': {
        const envelope = envelopeFrom(event.data)
        lastHandoff.value = event.data
        trace.value.push({
          kind: 'handoff',
          id: nextTraceId(),
          ...envelope,
          reason: event.data.reason,
          trigger_source: event.data.trigger_source,
          detail: event.data.detail
        })
        break
      }
      case 'usage': {
        const envelope = envelopeFrom(event.data)
        trace.value.push({
          kind: 'usage',
          id: nextTraceId(),
          ...envelope,
          input_tokens: event.data.input_tokens,
          output_tokens: event.data.output_tokens,
          cached_input_tokens: event.data.cached_input_tokens ?? null,
          estimated_cost: event.data.estimated_cost,
          currency: event.data.currency
        })
        break
      }
      case 'turn.completed': {
        turnCount.value += 1
        state.value = event.data.state
        const current = inFlightMessage()
        if (current) {
          current.streaming = false
          current.consultingToolKey = null
          current.blockedBy = event.data.blocked_by
          current.subject = event.data.subject
          if (event.data.message_id !== null) {
            current.id = event.data.message_id
            inFlightId = event.data.message_id
          }
          applyInFlightChannelMeta(liveTurn)
        }
        break
      }
      case 'error': {
        toast.add({
          title: t(event.data.message),
          color: 'error'
        })
        break
      }
      default:
        assertNever(event)
    }
  }

  async function hydrate(conversationId: number) {
    const originals = collectOriginalBodies(messages.value)
    const response = await get<AgentConversation>(`/api/agent-conversations/${conversationId}`)
    conversation.value = response.data
    state.value = response.data.state

    const mapped = mapTraceRows(response.data.trace)
    trace.value = mapped
    turnCount.value = maxTurn(mapped)

    const rows = response.data.messages ?? []
    messages.value = applyChannelMeta(displayMessagesFromApi(rows), mapped, originals)
    inFlightId = null
    liveTurn = null

    const handoffs = response.data.handoffs ?? []
    const latest = handoffs[handoffs.length - 1]
    if (latest) {
      lastHandoff.value = {
        reason: latest.reason,
        trigger_source: latest.trigger_source,
        detail: latest.detail
      }
    }
  }

  function handleCaught(error: unknown) {
    if (isDemoDisabledError(error) || (error instanceof AgentStreamError && error.demoDisabled)) {
      demoDisabled.value = true
      return
    }

    const key = error instanceof AgentStreamError ? error.message : 'demo.chat.streamError'
    const title = typeof key === 'string' && (key.startsWith('errors.') || key.startsWith('demo.'))
      ? t(key)
      : t('demo.chat.streamError')
    toast.add({
      title,
      color: 'error'
    })
  }

  async function send() {
    const input = composer.value.trim()
    if (input === '' || composerDisabled.value || !agentKey.value) {
      return
    }

    sending.value = true
    composer.value = ''

    const userMessage: DemoChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      subject: null,
      blockedBy: null,
      streaming: false,
      consultingToolKey: null,
      originalBody: null,
      channel: null
    }
    const assistantMessage: DemoChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      subject: null,
      blockedBy: null,
      streaming: true,
      consultingToolKey: null,
      originalBody: null,
      channel: null
    }

    try {
      if (!conversation.value) {
        await createConversation()
      }

      const current = conversation.value
      if (!current) {
        throw new AgentStreamError('errors.agent.turn_failed')
      }

      messages.value.push(userMessage, assistantMessage)
      inFlightId = assistantMessage.id

      await stream(current.id, input, applyEvent)

      const stillFlying = inFlightMessage()
      if (stillFlying) {
        stillFlying.streaming = false
        stillFlying.consultingToolKey = null
      }

      try {
        await hydrate(current.id)
      } catch {
        // Keep the streamed view if hydration fails.
      }
    } catch (error) {
      const flying = inFlightMessage()
      if (flying) {
        flying.streaming = false
        flying.consultingToolKey = null
      }
      handleCaught(error)
    } finally {
      sending.value = false
      inFlightId = null
    }
  }

  function cancelSend() {
    cancel()
    const flying = inFlightMessage()
    if (flying) {
      flying.streaming = false
      flying.consultingToolKey = null
    }
    sending.value = false
    inFlightId = null
  }

  return {
    agentKey,
    channel,
    personaId,
    verificationLevel,
    siteId,
    replyLocale,
    conversation,
    messages,
    trace,
    state,
    lastHandoff,
    sending,
    streaming,
    demoDisabled,
    composer,
    confirmOpen,
    hasTurns,
    composerDisabled,
    totals,
    setAgentKey,
    setChannel,
    setPersonaId,
    setVerificationLevel,
    setSiteId,
    setReplyLocale,
    confirmSetupChange,
    cancelSetupChange,
    reset,
    newConversation,
    send,
    cancelSend
  }
}
