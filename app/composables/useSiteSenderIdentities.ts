import type { ApiSiteSenderIdentity, CommunicationProviderType } from '~/types/communications'

interface ProviderState {
  submitting: boolean
  error: string | null
}

function createProviderState(): ProviderState {
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

  const states = reactive<Record<string, ProviderState>>({})

  function stateFor(providerType: CommunicationProviderType): ProviderState {
    states[providerType] ??= createProviderState()
    return states[providerType] as ProviderState
  }

  async function save(providerType: CommunicationProviderType, payload: {
    from_name: string
    from_email: string
    from_number: string
    reply_to_email: string
  }) {
    const state = stateFor(providerType)
    state.submitting = true
    state.error = null

    try {
      await put<ApiSiteSenderIdentity>(`/api/sites/${siteId.value}/sender-identities/${providerType}`, {
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
