import type { TokenResponse, VocalBridge } from '@vocalbridgeai/sdk'
import { useAuthStore } from '~/stores/auth'
import { useCopilotStore } from '~/stores/copilot'
import type { CopilotVoiceEndReason, CopilotVoiceTokenResponse } from '~/types/copilot'
import { onCopilotTurn } from '~/utils/copilotTurnBus'

type VoiceUiStatus = 'idle' | 'connecting' | 'live' | 'error'
type VbConnectionState
  = 'disconnected'
    | 'connecting'
    | 'waiting_for_agent'
    | 'connected'
    | 'reconnecting'
    | 'disconnecting'

type VoiceTurn = {
  id: string
  buffer: string
  settled: boolean
  delivered: boolean
  resolve: (text: string) => void
  deadline: ReturnType<typeof setTimeout> | null
  abandon: ReturnType<typeof setTimeout> | null
}

// Hang-guard, not UX filler. VB AI-agent mode already fills while waiting on
// our query. This exists solely so the onAIAgentQuery promise settles if
// Reverb drops, against CrmCopilotAgent #[Timeout(120)]. 15s fired on
// legitimate multi-tool turns VB was covering.
const ANSWER_DEADLINE_MS = 25_000
const ABANDON_MS = 300_000

let vb: VocalBridge | null = null
let currentTurn: VoiceTurn | null = null
let ourSessionId: number | null = null
let startedAtMs: number | null = null
let turnCount = 0
let wired = false
let queryUnsub: (() => void) | null = null

const connectionState = ref<VbConnectionState>('disconnected')
const lastError = ref<string | null>(null)
const connecting = ref(false)

function apiErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    return data?.message
  }
  return undefined
}

function createTurn(): VoiceTurn {
  return {
    id: crypto.randomUUID(),
    buffer: '',
    settled: false,
    delivered: false,
    resolve: () => {},
    deadline: null,
    abandon: null
  }
}

function settle(turn: VoiceTurn, text: string) {
  if (turn.settled) return
  turn.settled = true
  if (turn.deadline) {
    clearTimeout(turn.deadline)
    turn.deadline = null
  }
  turn.resolve(text)
}

// A turn is spoken exactly once via resolve and at most once more via
// sendAction, and never both with the same text.
function deliver(turn: VoiceTurn, text: string) {
  if (turn.delivered) return
  turn.delivered = true
  if (!turn.settled) {
    settle(turn, text)
    return
  }
  if (vb && (vb.state === 'connected' || vb.state === 'reconnecting')) {
    void vb.sendAction('copilot_answer_ready', { text })
  }
}

function clearTurn(turn: VoiceTurn) {
  if (turn.deadline) clearTimeout(turn.deadline)
  if (turn.abandon) clearTimeout(turn.abandon)
  if (currentTurn === turn) {
    currentTurn = null
  }
  const store = useCopilotStore()
  store.voiceTurnPending = false
}

async function patchSession(reason: CopilotVoiceEndReason) {
  if (ourSessionId === null) return
  const sessionId = ourSessionId
  ourSessionId = null
  const duration = startedAtMs === null
    ? null
    : Math.max(0, Math.round((Date.now() - startedAtMs) / 1000))
  startedAtMs = null
  const count = turnCount
  turnCount = 0

  try {
    const { patch } = useApi()
    await patch(`/api/copilot/voice/sessions/${sessionId}`, {
      duration_seconds: duration,
      turn_count: count,
      end_reason: reason,
      conversation_id: useCopilotStore().activeConversationId
    })
  } catch {
    // End-of-session accounting must not block hangup.
  }
}

export async function hangUpCopilotVoice(reason: CopilotVoiceEndReason = 'hangup'): Promise<void> {
  if (currentTurn) {
    clearTurn(currentTurn)
  }
  queryUnsub?.()
  queryUnsub = null

  const patchPromise = patchSession(reason)

  const instance = vb
  vb = null
  if (instance) {
    try {
      await instance.disconnect()
    } catch {
      // Already gone.
    }
  }

  await patchPromise
  connectionState.value = 'disconnected'
  connecting.value = false
}

export function useVocalBridgeCopilot() {
  const store = useCopilotStore()
  const { t } = useI18n()
  const auth = useAuthStore()

  const uiStatus = computed<VoiceUiStatus>(() => {
    if (connecting.value) return 'connecting'
    const state = connectionState.value
    if (state === 'connecting' || state === 'waiting_for_agent') {
      return 'connecting'
    }
    if (state === 'connected' || state === 'reconnecting') {
      return 'live'
    }
    if (lastError.value && state === 'disconnected') {
      return 'error'
    }
    return 'idle'
  })

  if (!wired) {
    wired = true

    onCopilotTurn((e) => {
      const turn = currentTurn
      if (!turn) return

      switch (e.type) {
        case 'started':
          if (turn.abandon) {
            clearTimeout(turn.abandon)
            turn.abandon = null
          }
          break

        case 'text':
          turn.buffer += e.delta
          break

        case 'paused_for_approval':
          settle(turn, [e.text.trim(), t('copilot.voice.needsApproval')].filter(Boolean).join(' '))
          turn.abandon = setTimeout(() => clearTurn(turn), ABANDON_MS)
          break

        case 'settled':
          deliver(turn, e.text.trim() || t('copilot.voice.noAnswer'))
          clearTurn(turn)
          break

        case 'failed':
          deliver(turn, t('copilot.voice.failed'))
          clearTurn(turn)
          break
      }
    })

    watch(() => store.activeConversationId, () => {
      const turn = currentTurn
      if (!turn) return
      deliver(turn, t('copilot.voice.interrupted'))
      clearTurn(turn)
    })
  }

  async function connect() {
    if (connecting.value || uiStatus.value === 'live' || uiStatus.value === 'connecting') {
      return
    }

    lastError.value = null
    connecting.value = true

    try {
      const { VocalBridge: VocalBridgeCtor } = await import('@vocalbridgeai/sdk')
      const { post } = useApi()

      const instance = new VocalBridgeCtor({
        auth: {
          tokenProvider: async (): Promise<TokenResponse> => {
            const res = await post<CopilotVoiceTokenResponse>('/api/copilot/voice/token', {})
            const data = res.data
            ourSessionId = data.session_id
            startedAtMs = Date.now()
            turnCount = 0
            return {
              url: data.url,
              token: data.token,
              room_name: data.room_name,
              participant_identity: data.participant_identity,
              expires_in: data.expires_in,
              agent_mode: data.agent_mode ?? undefined,
              livekit_url: data.livekit_url ?? undefined
            }
          }
        },
        participantName: auth.employee?.name ?? 'User'
      })

      queryUnsub = instance.onAIAgentQuery(async (query) => {
        if (!store.activeConversationId) await store.newConversation()
        if (store.isBusy || currentTurn) {
          console.debug('vocal-bridge overlap; in-flight turn continues')
          return t('copilot.voice.busy')
        }

        const turn = createTurn()
        currentTurn = turn
        store.voiceTurnPending = true
        turnCount += 1

        const promise = new Promise<string>((res) => {
          turn.resolve = res
        })
        turn.deadline = setTimeout(() => settle(turn, t('copilot.voice.working')), ANSWER_DEADLINE_MS)

        void store.sendMessage(query, { source: 'voice', clientMessageId: turn.id })
        return promise
      })

      instance.on('connectionStateChanged', (state) => {
        connectionState.value = state as VbConnectionState
      })

      instance.on('error', (error) => {
        lastError.value = error.message
        console.debug('vocal-bridge error', error)
      })

      vb = instance
      await instance.connect()
      connectionState.value = instance.state as VbConnectionState
    } catch (error) {
      const message = apiErrorMessage(error)
      if (message === 'errors.voice.not_configured') {
        lastError.value = t('copilot.voice.notConfigured')
      } else {
        lastError.value = t('copilot.voice.failed')
      }
      await hangUpCopilotVoice('error')
    } finally {
      connecting.value = false
    }
  }

  async function toggle() {
    if (uiStatus.value === 'live' || uiStatus.value === 'connecting') {
      await hangUpCopilotVoice('hangup')
      return
    }
    await connect()
  }

  return {
    uiStatus,
    lastError,
    toggle,
    hangUp: hangUpCopilotVoice
  }
}
