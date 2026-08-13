import type { AiSummary, AiSummaryResponse } from '~/types/aiSummary'

const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 120_000

export function useAiSummary(entity: 'contact' | 'deal', id: MaybeRefOrGetter<number>) {
  const { get, post } = useApi()
  const { locale } = useI18n()

  const current = ref<AiSummary | null>(null)
  const inFlight = ref<AiSummary | null>(null)
  const lastFailed = ref<AiSummary | null>(null)
  const isStale = ref(false)
  const canGenerate = ref(false)
  const pending = ref(false)
  const generating = ref(false)
  const error = ref<string | null>(null)
  const timedOut = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let pollStartedAt: number | null = null

  const basePath = computed(() => {
    const subjectId = toValue(id)
    return entity === 'contact'
      ? `/api/contacts/${subjectId}/ai-summary`
      : `/api/deals/${subjectId}/ai-summary`
  })

  function applyPayload(payload: AiSummaryResponse) {
    current.value = payload.current
    inFlight.value = payload.in_flight
    lastFailed.value = payload.last_failed
    isStale.value = payload.is_stale
    canGenerate.value = payload.can_generate
  }

  async function fetchSummary() {
    pending.value = true
    error.value = null
    try {
      const response = await get<AiSummaryResponse>(basePath.value)
      applyPayload(response.data)
      syncPolling()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      error.value = err.data?.message ?? 'errors.unknown'
    } finally {
      pending.value = false
    }
  }

  async function generate() {
    generating.value = true
    error.value = null
    timedOut.value = false
    try {
      const response = await post<AiSummary>(basePath.value, {
        locale: locale.value
      })
      inFlight.value = response.data
      canGenerate.value = false
      pollStartedAt = Date.now()
      startPolling()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }, statusCode?: number, status?: number }
      error.value = err.data?.message ?? 'errors.unknown'
      await fetchSummary()
    } finally {
      generating.value = false
    }
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      void pollOnce()
    }, POLL_INTERVAL_MS)
    void pollOnce()
  }

  async function pollOnce() {
    if (pollStartedAt !== null && Date.now() - pollStartedAt > POLL_TIMEOUT_MS) {
      stopPolling()
      timedOut.value = true
      return
    }

    try {
      const response = await get<AiSummaryResponse>(basePath.value)
      applyPayload(response.data)
      if (inFlight.value === null) {
        stopPolling()
        pollStartedAt = null
      }
    } catch {
      // Next cycle retries.
    }
  }

  function syncPolling() {
    if (inFlight.value !== null) {
      if (pollTimer === null) {
        pollStartedAt = pollStartedAt ?? Date.now()
        startPolling()
      }
      return
    }
    stopPolling()
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(() => toValue(id), () => {
    stopPolling()
    pollStartedAt = null
    timedOut.value = false
    void fetchSummary()
  })

  onMounted(() => {
    void fetchSummary()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    current,
    inFlight,
    lastFailed,
    isStale,
    canGenerate,
    pending,
    generating,
    error,
    timedOut,
    fetchSummary,
    generate
  }
}
