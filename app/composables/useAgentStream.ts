import {
  AGENT_STREAM_EVENT_NAMES,
  type AgentStreamEvent,
  type AgentStreamEventName
} from '~/types/agents'
import { apiHeaders } from '~/utils/apiHeaders'
import { bodyContainsDemoDisabled, DEMO_DISABLED_KEY } from '~/utils/demoDisabled'

const TURN_TIMEOUT_MS = 60_000

const KNOWN_EVENTS = new Set<string>(AGENT_STREAM_EVENT_NAMES)

export class AgentStreamError extends Error {
  readonly demoDisabled: boolean

  constructor(message: string, demoDisabled = false) {
    super(message)
    this.name = 'AgentStreamError'
    this.demoDisabled = demoDisabled
  }
}

export function useAgentStream() {
  const config = useRuntimeConfig()
  const streaming = ref(false)

  let abort: AbortController | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false
  let cancelled = false

  function clearTimer() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function cancel() {
    cancelled = true
    abort?.abort()
    clearTimer()
  }

  async function stream(
    conversationId: number,
    input: string,
    onEvent: (event: AgentStreamEvent) => void
  ): Promise<void> {
    cancel()
    cancelled = false
    timedOut = false
    abort = new AbortController()
    streaming.value = true
    timeoutId = setTimeout(() => {
      timedOut = true
      abort?.abort()
    }, TURN_TIMEOUT_MS)

    try {
      const url = `${config.public.apiBaseUrl}/api/agent-conversations/${conversationId}/turns`
      const response = await fetch(url, {
        method: 'POST',
        headers: apiHeaders({
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        }),
        body: JSON.stringify({ input }),
        signal: abort.signal
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        if (bodyContainsDemoDisabled(body)) {
          throw new AgentStreamError(DEMO_DISABLED_KEY, true)
        }

        const message = typeof body === 'object' && body !== null && 'message' in body
          && typeof body.message === 'string'
          ? body.message
          : 'errors.agent.turn_failed'
        throw new AgentStreamError(message)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new AgentStreamError('errors.agent.turn_failed')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          buffer += decoder.decode()
          flushSseBuffer(buffer, onEvent)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        buffer = flushSseBuffer(buffer, onEvent)
      }
    } catch (error) {
      if (cancelled && !timedOut) {
        return
      }

      if (error instanceof AgentStreamError) {
        throw error
      }

      if (isAbortError(error)) {
        throw new AgentStreamError('errors.agent.turn_failed')
      }

      throw new AgentStreamError('errors.agent.turn_failed')
    } finally {
      clearTimer()
      streaming.value = false
    }
  }

  onBeforeUnmount(() => {
    cancel()
  })

  return { stream, cancel, streaming }
}

function flushSseBuffer(
  buffer: string,
  onEvent: (event: AgentStreamEvent) => void
): string {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''

  for (const chunk of parts) {
    const parsed = parseSseChunk(chunk)
    if (parsed) {
      onEvent(parsed)
    }
  }

  return rest
}

function parseSseChunk(chunk: string): AgentStreamEvent | null {
  const trimmed = chunk.trim()
  if (trimmed === '' || trimmed.startsWith(':')) {
    return null
  }

  let eventName: string | null = null
  const dataLines: Array<string> = []

  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (eventName === null || !KNOWN_EVENTS.has(eventName)) {
    return null
  }

  let data: unknown = {}
  if (dataLines.length > 0) {
    try {
      data = JSON.parse(dataLines.join('\n'))
    } catch {
      return null
    }
  }

  return { event: eventName as AgentStreamEventName, data } as AgentStreamEvent
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
