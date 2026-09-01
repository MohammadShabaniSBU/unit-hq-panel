import type {
  AgentEntityRef,
  AgentTraceEntry,
  AgentTraceEnvelope,
  AgentTraceGuardrailEntry,
  AgentToolRecovery,
  ChannelGuardDetail,
  DemoChatMessage,
  DemoMessageChannel,
  GuardVerdict,
  ToolInvocationStatus
} from '~/types/agents'

export interface AgentTraceMessageGroup {
  kind: 'message'
  messageId: number | null
  seq: number
  rewritten: boolean
  blocked: boolean
  guardrails: Array<AgentTraceGuardrailEntry>
}

export interface AgentTraceLooseRow {
  kind: 'entry'
  seq: number
  entry: Exclude<AgentTraceEntry, AgentTraceGuardrailEntry>
}

export type AgentTraceTurnRow = AgentTraceMessageGroup | AgentTraceLooseRow

export interface AgentTraceTurnGroup {
  turn: number | null
  model: string | null
  promptVersion: string | null
  occurredAt: string | null
  rows: Array<AgentTraceTurnRow>
}

const GUARD_VERDICTS = new Set<GuardVerdict>(['pass', 'warn', 'deny', 'block', 'handoff'])

export function envelopeFrom(data: AgentTraceEnvelope | Record<string, unknown>): AgentTraceEnvelope {
  return {
    conversation_id: asInt(data.conversation_id),
    turn: asInt(data.turn),
    seq: asInt(data.seq),
    message_id: asInt(data.message_id),
    model: asString(data.model),
    prompt_version: asString(data.prompt_version),
    occurred_at: asString(data.occurred_at)
  }
}

export function compareSeq(a: { seq?: number | null }, b: { seq?: number | null }): number {
  return (a.seq ?? 0) - (b.seq ?? 0)
}

export function unwrapChannelDetail(raw: unknown): ChannelGuardDetail | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const outer = raw as Record<string, unknown>
  const nested = outer.detail
  const inner = nested !== null && typeof nested === 'object' && !Array.isArray(nested)
    ? { ...outer, ...(nested as Record<string, unknown>) }
    : outer

  const detail: ChannelGuardDetail = {}
  if (typeof inner.segments === 'number') {
    detail.segments = inner.segments
  }
  if (typeof inner.encoding === 'string') {
    detail.encoding = inner.encoding
  }
  if (inner.gsm7_transliterated === true) {
    detail.gsm7_transliterated = true
  }
  if (typeof inner.max_segments === 'number') {
    detail.max_segments = inner.max_segments
  }
  if (typeof inner.reason === 'string') {
    detail.reason = inner.reason
  }
  if (inner.advisory === true) {
    detail.advisory = true
  }
  if (typeof inner.outside_window_mode === 'string') {
    detail.outside_window_mode = inner.outside_window_mode
  }
  if (typeof inner.inside_window_mode === 'string') {
    detail.inside_window_mode = inner.inside_window_mode
  }
  if (typeof inner.requires_template_outside_window === 'boolean') {
    detail.requires_template_outside_window = inner.requires_template_outside_window
  }
  if (inner.html_stripped === true) {
    detail.html_stripped = true
  }
  if (inner.missing_subject === true) {
    detail.missing_subject = true
  }

  return Object.keys(detail).length > 0 ? detail : null
}

export function isChannelGuardrail(entry: AgentTraceEntry): entry is AgentTraceGuardrailEntry {
  return entry.kind === 'guardrail' && entry.guard === 'channel'
}

export function deriveChannelMeta(
  entries: Array<AgentTraceEntry>,
  target: {
    messageId?: number | string | null
    turn?: number | null
    originalBody?: string | null
  }
): DemoMessageChannel | null {
  const numericId = typeof target.messageId === 'number' ? target.messageId : null
  const rows = entries
    .filter(isChannelGuardrail)
    .filter(row => matchesChannelTarget(row, numericId, target.turn ?? null))
    .sort(compareSeq)

  if (rows.length === 0) {
    return null
  }

  const sent = lastSent(rows)
  if (sent === null) {
    return null
  }

  const detail = unwrapChannelDetail(sent.detail)
  if (detail === null || typeof detail.segments !== 'number' || !detail.encoding) {
    return null
  }

  const sentSeq = sent.seq ?? 0
  const redrafted = rows.some(row => row.verdict === 'deny' && (row.seq ?? 0) < sentSeq)

  return {
    detail,
    verdict: sent.verdict,
    redrafted,
    originalBody: target.originalBody ?? null
  }
}

export function collectOriginalBodies(messages: Array<DemoChatMessage>): Map<string, string> {
  const originals = new Map<string, string>()
  for (const message of messages) {
    const original = message.originalBody ?? message.channel?.originalBody
    if (original) {
      originals.set(String(message.id), original)
    }
  }
  return originals
}

export function applyChannelMeta(
  messages: Array<DemoChatMessage>,
  entries: Array<AgentTraceEntry>,
  originals: Map<string, string>
): Array<DemoChatMessage> {
  return messages.map((message) => {
    if (message.role !== 'assistant') {
      return { ...message, channel: null }
    }

    const originalBody = originals.get(String(message.id))
      ?? message.originalBody
      ?? message.channel?.originalBody
      ?? null
    const numericId = typeof message.id === 'number' ? message.id : null
    const turn = turnForMessage(entries, numericId)
    const channel = deriveChannelMeta(entries, {
      messageId: message.id,
      turn,
      originalBody
    })

    return {
      ...message,
      originalBody,
      channel
    }
  })
}

export function mapTraceRows(raw: unknown): Array<AgentTraceEntry> {
  if (!Array.isArray(raw)) {
    return []
  }

  const rows: Array<AgentTraceEntry> = []
  for (const item of raw) {
    const mapped = mapTraceRow(item)
    if (mapped) {
      rows.push(mapped)
    }
  }

  return rows.sort(compareSeq)
}

export function groupTrace(entries: Array<AgentTraceEntry>): Array<AgentTraceTurnGroup> {
  const sorted = [...entries].sort(compareSeq)
  const byTurn = new Map<number | 'none', Array<AgentTraceEntry>>()

  for (const entry of sorted) {
    const key = entry.turn ?? 'none'
    const bucket = byTurn.get(key)
    if (bucket) {
      bucket.push(entry)
    } else {
      byTurn.set(key, [entry])
    }
  }

  const groups: Array<AgentTraceTurnGroup> = []
  for (const [key, rows] of byTurn) {
    const first = rows[0]
    groups.push({
      turn: key === 'none' ? null : key,
      model: first?.model ?? null,
      promptVersion: first?.prompt_version ?? null,
      occurredAt: first?.occurred_at ?? null,
      rows: groupTurnRows(rows)
    })
  }

  groups.sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0))
  return groups
}

export function channelOutcome(guardrails: Array<AgentTraceGuardrailEntry>): {
  rewritten: boolean
  blocked: boolean
} {
  const channel = guardrails.filter(row => row.guard === 'channel').sort(compareSeq)
  const sent = lastSent(channel)
  if (sent !== null) {
    const sentSeq = sent.seq ?? 0
    return {
      rewritten: channel.some(row => row.verdict === 'deny' && (row.seq ?? 0) < sentSeq),
      blocked: false
    }
  }

  return {
    rewritten: false,
    blocked: channel.some(row => row.verdict === 'deny')
  }
}

export function maxTurn(entries: Array<AgentTraceEntry>): number {
  let max = 0
  for (const entry of entries) {
    if (typeof entry.turn === 'number' && entry.turn > max) {
      max = entry.turn
    }
  }
  return max
}

function groupTurnRows(rows: Array<AgentTraceEntry>): Array<AgentTraceTurnRow> {
  const guardrailsByMessage = new Map<string, Array<AgentTraceGuardrailEntry>>()
  const loose: Array<AgentTraceLooseRow> = []

  for (const entry of rows) {
    if (entry.kind !== 'guardrail') {
      loose.push({ kind: 'entry', seq: entry.seq ?? 0, entry })
      continue
    }

    const key = entry.message_id == null ? 'null' : String(entry.message_id)
    const bucket = guardrailsByMessage.get(key)
    if (bucket) {
      bucket.push(entry)
    } else {
      guardrailsByMessage.set(key, [entry])
    }
  }

  const grouped: Array<AgentTraceTurnRow> = [...loose]
  for (const [key, guardrails] of guardrailsByMessage) {
    const sorted = [...guardrails].sort(compareSeq)
    const outcome = channelOutcome(sorted)
    grouped.push({
      kind: 'message',
      messageId: key === 'null' ? null : Number(key),
      seq: sorted[0]?.seq ?? 0,
      rewritten: outcome.rewritten,
      blocked: outcome.blocked,
      guardrails: sorted
    })
  }

  grouped.sort((a, b) => a.seq - b.seq)
  return grouped
}

function lastSent(rows: Array<AgentTraceGuardrailEntry>): AgentTraceGuardrailEntry | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i]
    if (row && (row.verdict === 'pass' || row.verdict === 'warn')) {
      return row
    }
  }
  return null
}

function matchesChannelTarget(
  row: AgentTraceGuardrailEntry,
  numericId: number | null,
  turn: number | null
): boolean {
  if (numericId != null && row.message_id === numericId) {
    return true
  }

  return row.message_id == null && turn != null && row.turn === turn
}

function turnForMessage(entries: Array<AgentTraceEntry>, messageId: number | null): number | null {
  if (messageId == null) {
    return null
  }

  for (const entry of entries) {
    if (entry.message_id === messageId && typeof entry.turn === 'number') {
      return entry.turn
    }
  }

  return null
}

function mapTraceRow(raw: unknown): AgentTraceEntry | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const row = raw as Record<string, unknown>
  const kind = row.kind
  const envelope = envelopeFrom(row)
  const id = row.id == null ? 'trace-unknown' : String(row.id)

  if (kind === 'tool') {
    return {
      ...envelope,
      kind: 'tool',
      id,
      tool_key: typeof row.tool_key === 'string' ? row.tool_key : '',
      arguments: isRecord(row.arguments) ? row.arguments : {},
      status: asToolStatus(row.status),
      denied_reason: typeof row.denied_reason === 'string' ? row.denied_reason : null,
      duration_ms: asInt(row.duration_ms) ?? undefined,
      result_summary: typeof row.result_summary === 'string' ? row.result_summary : undefined,
      result: row.result,
      invocation_id: asInt(row.invocation_id) ?? asInt(row.id) ?? undefined,
      pending_action_id: asInt(row.pending_action_id),
      replayed: row.replayed === true,
      entities: asEntities(row.entities),
      error_code: typeof row.error_code === 'string' ? row.error_code : null,
      recovery: asRecovery(row.recovery)
    }
  }

  if (kind === 'guardrail') {
    const verdict = asVerdict(row.verdict)
    if (verdict === null) {
      return null
    }
    return {
      ...envelope,
      kind: 'guardrail',
      id,
      guard: typeof row.guard === 'string' ? row.guard : 'unknown',
      verdict,
      detail: row.detail
    }
  }

  if (kind === 'handoff') {
    return {
      ...envelope,
      kind: 'handoff',
      id,
      reason: typeof row.reason === 'string' ? row.reason : '',
      trigger_source: typeof row.trigger_source === 'string' ? row.trigger_source : '',
      detail: row.detail
    }
  }

  if (kind === 'usage') {
    return {
      ...envelope,
      kind: 'usage',
      id,
      input_tokens: asInt(row.input_tokens) ?? 0,
      output_tokens: asInt(row.output_tokens) ?? 0,
      cached_input_tokens: asInt(row.cached_input_tokens),
      estimated_cost: typeof row.estimated_cost === 'string' ? row.estimated_cost : null,
      currency: typeof row.currency === 'string' ? row.currency : null
    }
  }

  if (kind === 'promotion') {
    return {
      ...envelope,
      kind: 'promotion',
      id,
      from: typeof row.from === 'string' ? row.from : '',
      to: typeof row.to === 'string' ? row.to : '',
      method: typeof row.method === 'string' ? row.method : ''
    }
  }

  return null
}

function asVerdict(value: unknown): GuardVerdict | null {
  if (typeof value !== 'string') {
    return null
  }
  return GUARD_VERDICTS.has(value as GuardVerdict) ? value as GuardVerdict : null
}

function asToolStatus(value: unknown): ToolInvocationStatus | undefined {
  if (value === 'ok' || value === 'denied' || value === 'not_found' || value === 'error') {
    return value
  }
  return undefined
}

function asEntities(value: unknown): Array<AgentEntityRef> {
  if (!Array.isArray(value)) {
    return []
  }

  const entities: Array<AgentEntityRef> = []
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue
    }
    const row = item as Record<string, unknown>
    if (typeof row.type !== 'string' || typeof row.id !== 'number' || typeof row.label !== 'string') {
      continue
    }
    entities.push({
      type: row.type,
      id: row.id,
      label: row.label,
      context: typeof row.context === 'string' ? row.context : null
    })
  }
  return entities
}

function asRecovery(value: unknown): AgentToolRecovery | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const row = value as Record<string, unknown>
  if (typeof row.tool !== 'string' || typeof row.hint !== 'string') {
    return null
  }
  return { tool: row.tool, hint: row.hint }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}
