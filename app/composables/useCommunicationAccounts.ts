import type { ApiCommunicationAccount, CommunicationProviderType } from '~/types/communications'

interface ProviderState {
  submitting: boolean
  error: string | null
}

function createProviderState(): ProviderState {
  return { submitting: false, error: null }
}

export function useCommunicationAccounts() {
  const { get, put, post, del } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    'settings-communications',
    () => get<Array<ApiCommunicationAccount>>('/api/settings/communications')
  )

  const accounts = computed(() => data.value?.data ?? [])

  const states = reactive<Record<string, ProviderState>>({})

  function stateFor(providerType: CommunicationProviderType): ProviderState {
    states[providerType] ??= createProviderState()
    return states[providerType] as ProviderState
  }

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function saveApiKey(providerType: CommunicationProviderType, apiKey: string) {
    const state = stateFor(providerType)
    state.submitting = true
    state.error = null

    try {
      await put<ApiCommunicationAccount>(`/api/settings/communications/${providerType}`, { api_key: apiKey })
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.saveErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  async function createWebhook(providerType: CommunicationProviderType) {
    const state = stateFor(providerType)
    state.submitting = true
    state.error = null

    try {
      await post<ApiCommunicationAccount>(`/api/settings/communications/${providerType}/webhook`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      state.error = extractErrorMessage(err, t('forms.communications.webhookErrorMessage'))
      return false
    } finally {
      state.submitting = false
    }
  }

  async function removeAccount(providerType: CommunicationProviderType) {
    const state = stateFor(providerType)
    state.submitting = true
    state.error = null

    try {
      await del(`/api/settings/communications/${providerType}`)
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
    accounts,
    pending,
    error,
    refresh,
    stateFor,
    saveApiKey,
    createWebhook,
    removeAccount
  }
}
