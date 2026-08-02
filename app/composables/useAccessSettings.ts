import type { AccessProvider, ApiAccessSettings } from '~/types/access'

export function useAccessSettings() {
  const { get, put, post, del } = useApi()
  const { t } = useI18n()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-access',
    () => get<ApiAccessSettings>('/api/settings/access')
  )

  const settings = computed(() => data.value?.data ?? null)
  const accounts = computed(() => settings.value?.accounts ?? [])
  const providerOptions = computed(() => settings.value?.provider_options ?? [])
  const activeProvider = computed(() => settings.value?.active_provider ?? null)
  const attention = computed(() => settings.value?.attention ?? {
    unmapped_points_count: 0,
    unresolved_contacts_count: 0
  })

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function save(payload: {
    provider: AccessProvider | string
    credentials: Record<string, string>
    activate?: boolean
  }) {
    submitting.value = true
    actionError.value = null

    try {
      await put<ApiAccessSettings>('/api/settings/access', payload)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.saveErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function createWebhook() {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiAccessSettings>('/api/settings/access/webhook', {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.webhookErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function refreshPoints() {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiAccessSettings>('/api/settings/access/points/refresh', {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.refreshPointsErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function disconnect() {
    submitting.value = true
    actionError.value = null

    try {
      await del('/api/settings/access')
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.removeErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function revokeUnknownGrant(grantRef: string) {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiAccessSettings>('/api/settings/access/unknown-grants/revoke', {
        grant_ref: grantRef
      })
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.access.health.revokeError'))
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
    attention,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    save,
    createWebhook,
    refreshPoints,
    revokeUnknownGrant,
    disconnect
  }
}
