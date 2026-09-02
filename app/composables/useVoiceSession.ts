import type { VoiceSession } from '~/types/voiceSession'

export function useVoiceSession(sessionId: Ref<number | null> | ComputedRef<number | null>) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    () => `voice-session-${sessionId.value ?? 'none'}`,
    async () => {
      if (!sessionId.value) {
        return null
      }
      const response = await get<VoiceSession>(`/api/voice-sessions/${sessionId.value}`)
      return response.data
    },
    { watch: [sessionId] }
  )

  const session = computed(() => data.value ?? null)

  return { session, pending, error, refresh }
}
