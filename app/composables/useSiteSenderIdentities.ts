import type { ApiSiteSenderIdentity, CommunicationChannel } from '~/types/communications'

interface ChannelState {
  submitting: boolean
  error: string | null
}

function createChannelState(): ChannelState {
  return { submitting: false, error: null }
}

export function useSiteSenderIdentities(siteId: Ref<number>) {
  const { get, put } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    () => `site-sender-identities-${siteId.value}`,
    () => get<Array<ApiSiteSenderIdentity>>(`/api/sites/${siteId.value}/sender-identities`),
    { watch: [siteId] }
  )

  const identities = computed(() => data.value?.data ?? [])

  const states = reactive<Record<string, ChannelState>>({})

  function stateFor(channel: CommunicationChannel): ChannelState {
    states[channel] ??= createChannelState()
    return states[channel] as ChannelState
  }

  async function save(channel: CommunicationChannel, payload: {
    from_name: string
    from_email: string
    from_number: string
    reply_to_email: string
  }) {
    const state = stateFor(channel)
    state.submitting = true
    state.error = null

    try {
      await put<ApiSiteSenderIdentity>(`/api/sites/${siteId.value}/sender-identities/${channel}`, {
        from_name: payload.from_name || null,
        from_email: payload.from_email || null,
        from_number: payload.from_number || null,
        reply_to_email: payload.reply_to_email || null
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      state.error = fetchError.data?.message ?? t('forms.communications.saveErrorMessage')
      return false
    } finally {
      state.submitting = false
    }
  }

  return {
    identities,
    pending,
    error,
    refresh,
    stateFor,
    save
  }
}
