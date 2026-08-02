import type { ApiEsignSettings, EsignProvider } from '~/types/esign'

export function useEsignSettings() {
  const { get, put, post, del } = useApi()
  const { t } = useI18n()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-esign',
    () => get<ApiEsignSettings>('/api/settings/esign')
  )

  const settings = computed(() => data.value?.data ?? null)
  const accounts = computed(() => settings.value?.accounts ?? [])
  const providerOptions = computed(() => settings.value?.provider_options ?? [])
  const activeProvider = computed(() => settings.value?.active_provider ?? null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function save(payload: {
    provider: EsignProvider | string
    credentials: Record<string, string>
    activate?: boolean
  }) {
    submitting.value = true
    actionError.value = null

    try {
      await put<ApiEsignSettings>('/api/settings/esign', payload)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.esign.saveErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function createWebhook() {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiEsignSettings>('/api/settings/esign/webhook', {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.esign.webhookErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function disconnect() {
    submitting.value = true
    actionError.value = null

    try {
      await del('/api/settings/esign')
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.esign.removeErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    settings,
    accounts,
    providerOptions,
    activeProvider,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    save,
    createWebhook,
    disconnect
  }
}
