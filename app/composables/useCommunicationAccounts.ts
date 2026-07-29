import type {
  ApiCommunicationChannel,
  CommunicationChannel,
  CommunicationProvider
} from '~/types/communications'

interface ChannelState {
  submitting: boolean
  error: string | null
}

function createChannelState(): ChannelState {
  return { submitting: false, error: null }
}

export function useCommunicationAccounts() {
  const { get, put, post, del } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    'settings-communications',
    () => get<Array<ApiCommunicationChannel>>('/api/settings/communications')
  )

  const channels = computed(() => data.value?.data ?? [])

  const states = reactive<Record<string, ChannelState>>({})

  function stateFor(channel: CommunicationChannel): ChannelState {
    states[channel] ??= createChannelState()
    return states[channel] as ChannelState
  }

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function saveChannel(
    channel: CommunicationChannel,
    payload: {
      provider: CommunicationProvider
      credentials: Record<string, string>
      activate?: boolean
    }
  ) {
    const state = stateFor(channel)
    state.submitting = true
    state.error = null

    try {
      await put<ApiCommunicationChannel>(`/api/settings/communications/${channel}`, payload)
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.saveErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  async function createWebhook(channel: CommunicationChannel) {
    const state = stateFor(channel)
    state.submitting = true
    state.error = null

    try {
      await post<ApiCommunicationChannel>(`/api/settings/communications/${channel}/webhook`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.webhookErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  async function deleteWebhook(channel: CommunicationChannel) {
    const state = stateFor(channel)
    state.submitting = true
    state.error = null

    try {
      await del(`/api/settings/communications/${channel}/webhook`)
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.webhookErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  async function disconnectProvider(channel: CommunicationChannel, provider: CommunicationProvider) {
    const state = stateFor(channel)
    state.submitting = true
    state.error = null

    try {
      await del(`/api/settings/communications/${channel}/${provider}`)
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.removeErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  return {
    channels,
    pending,
    error,
    refresh,
    stateFor,
    saveChannel,
    createWebhook,
    deleteWebhook,
    disconnectProvider
  }
}
