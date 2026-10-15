import type { Ref } from 'vue'
import type { EmailDocumentV2 } from '~/types/email-block-document'
import type {
  AssistDispatch,
  AssistFinished,
  AssistMessage,
  AssistReportStatus,
  AssistSession,
  AssistTurnDetail,
  AssistTurnSummary
} from '~/types/template-assist'

interface AssistError {
  key: string
  status: number
}

export function useTemplateAssist(
  familyId: Ref<string>,
  locale: Ref<string | null>
) {
  const { get, post } = useApi()
  const echo = useEcho()

  const sessionId = ref<number | null>(null)
  const messages = ref<Array<AssistMessage>>([])
  const turns = ref<Array<AssistTurnSummary>>([])
  const streamingText = ref('')
  const working = ref(false)
  const running = ref(false)
  const error = ref<AssistError | null>(null)
  const finished = ref<AssistFinished | null>(null)

  let channelName: string | null = null
  let discardTurnId: number | null = null
  let activeTurnId: number | null = null
  let finishNonce = 0

  function applySession(session: AssistSession | null) {
    if (!session) {
      sessionId.value = null
      messages.value = []
      turns.value = []
      return
    }
    sessionId.value = session.id
    messages.value = session.messages ?? []
    turns.value = session.turns ?? []
  }

  async function loadSession() {
    const currentLocale = locale.value
    if (!currentLocale) return
    const response = await get<AssistSession | null>(
      `/api/template-families/${familyId.value}/assist/session`,
      { locale: currentLocale }
    )
    applySession(response.data)
  }

  async function createSession(): Promise<number | null> {
    const currentLocale = locale.value
    if (!currentLocale) return null
    const response = await post<AssistSession>(
      `/api/template-families/${familyId.value}/assist/sessions`,
      { locale: currentLocale }
    )
    applySession(response.data)
    return response.data.id
  }

  async function ensureSession(): Promise<number | null> {
    if (sessionId.value != null) return sessionId.value
    await loadSession()
    if (sessionId.value != null) return sessionId.value
    return createSession()
  }

  function unsubscribe() {
    if (!channelName) return
    echo.leave(channelName)
    channelName = null
  }

  function subscribe(id: number) {
    const next = `template-assist.${id}`
    if (channelName === next) return
    unsubscribe()
    channelName = next
    const channel = echo.private(next)
    channel.listen('.text_delta', (payload: { delta?: string }) => {
      if (discardTurnId != null) return
      working.value = false
      streamingText.value += payload.delta ?? ''
    })
    channel.listen('.template-assist.working', () => {
      if (discardTurnId != null) return
      working.value = true
    })
    channel.listen('.template-assist.turn.finished', (payload: { turn_id?: number, status?: string }) => {
      const turnId = Number(payload.turn_id)
      const status = String(payload.status ?? '')
      void settleFinished(turnId, status)
    })
  }

  async function settleFinished(turnId: number, status: string) {
    working.value = false
    running.value = false
    streamingText.value = ''
    const discarding = discardTurnId === turnId
    discardTurnId = null
    activeTurnId = null
    try {
      if (discarding && status === 'completed') {
        await reportStatus(turnId, 'discarded')
      }
      await loadSession()
    } catch {
      // The turn payload is loaded next. A session refresh failure still settles the turn.
    }
    if (discarding) return
    finishNonce += 1
    finished.value = { turnId, status, nonce: finishNonce }
  }

  async function send(
    message: string,
    templateVersionId: number,
    document: EmailDocumentV2
  ): Promise<boolean> {
    error.value = null
    const id = await ensureSession()
    if (id == null) return false
    const clientMessageId = crypto.randomUUID()
    try {
      const response = await post<AssistDispatch>(
        `/api/template-assist/sessions/${id}/turns`,
        {
          client_message_id: clientMessageId,
          message,
          template_version_id: templateVersionId,
          document
        } as unknown as Record<string, unknown>
      )
      activeTurnId = response.data.turn_id
      running.value = true
      working.value = false
      streamingText.value = ''
      messages.value = [
        ...messages.value,
        {
          id: clientMessageId,
          role: 'user',
          content: message
        }
      ]
      return true
    } catch (err: unknown) {
      error.value = readError(err)
      return false
    }
  }

  function stop() {
    if (activeTurnId == null) return
    discardTurnId = activeTurnId
    streamingText.value = ''
    working.value = false
    running.value = false
  }

  async function newChat() {
    stop()
    discardTurnId = null
    error.value = null
    streamingText.value = ''
    await createSession()
  }

  async function fetchTurn(turnId: number): Promise<AssistTurnDetail> {
    const response = await get<AssistTurnDetail>(`/api/template-assist/turns/${turnId}`)
    return response.data
  }

  async function reportStatus(turnId: number, status: AssistReportStatus) {
    const response = await post<AssistTurnDetail>(
      `/api/template-assist/turns/${turnId}/status`,
      { status }
    )
    const turn = turns.value.find(item => item.id === turnId)
    if (turn) turn.status = response.data.status
    return response.data
  }

  function clearError() {
    error.value = null
  }

  watch(sessionId, (id) => {
    if (id == null) {
      unsubscribe()
      return
    }
    subscribe(id)
  })

  watch(locale, () => {
    streamingText.value = ''
    working.value = false
    running.value = false
    void loadSession()
  }, { immediate: true })

  onBeforeUnmount(() => {
    unsubscribe()
  })

  return {
    sessionId,
    messages,
    turns,
    streamingText,
    working,
    running,
    error,
    finished,
    loadSession,
    send,
    stop,
    newChat,
    fetchTurn,
    reportStatus,
    clearError
  }
}

function readError(err: unknown): AssistError {
  if (!err || typeof err !== 'object') {
    return { key: 'assist.provider_error', status: 0 }
  }
  const record = err as {
    status?: number
    statusCode?: number
    data?: { message?: string }
  }
  return {
    status: record.statusCode ?? record.status ?? 0,
    key: record.data?.message || 'assist.provider_error'
  }
}
