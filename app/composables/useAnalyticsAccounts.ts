import type {
  AnalyticsAccount,
  AnalyticsAccountWritePayload,
  AnalyticsVerifyResult
} from '~/types/insights'

function extractErrorMessage(err: unknown, fallback: string): string {
  const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const firstFieldError = fetchError.data?.errors
    ? Object.values(fetchError.data.errors)[0]?.[0]
    : undefined
  return firstFieldError ?? fetchError.data?.message ?? fallback
}

export function useAnalyticsAccounts(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { get, post, patch } = useApi()
  const { t } = useI18n()
  const enabled = computed(() => toValue(options.enabled ?? true))

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-analytics-accounts',
    async () => {
      if (!enabled.value) {
        return { message: '', data: [] as Array<AnalyticsAccount> }
      }
      return get<Array<AnalyticsAccount>>('/api/settings/analytics-accounts')
    },
    { watch: [enabled] }
  )

  const accounts = computed(() => data.value?.data ?? [])

  async function create(payload: AnalyticsAccountWritePayload): Promise<AnalyticsAccount | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await post<AnalyticsAccount>('/api/settings/analytics-accounts', {
        ...payload
      })
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.insights.connections.saveError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(
    id: number,
    payload: Omit<AnalyticsAccountWritePayload, 'provider'>
  ): Promise<AnalyticsAccount | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await patch<AnalyticsAccount>(`/api/settings/analytics-accounts/${id}`, {
        ...payload
      })
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.insights.connections.saveError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function verify(id: number): Promise<AnalyticsVerifyResult | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await post<AnalyticsVerifyResult>(
        `/api/settings/analytics-accounts/${id}/verify`,
        {}
      )
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.insights.connections.verifyError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function setDefault(id: number): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post(`/api/settings/analytics-accounts/${id}/default`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.insights.connections.defaultError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: number): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post(`/api/settings/analytics-accounts/${id}/archive`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.insights.connections.archiveError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    accounts,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    create,
    update,
    verify,
    setDefault,
    archive
  }
}
