import type {
  AiProviderAccount,
  AiProviderAccountCreatePayload,
  AiProviderAccountUpdatePayload,
  AiVerifyResult
} from '~/types/ai'

function extractErrorMessage(err: unknown, fallback: string): string {
  const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const firstFieldError = fetchError.data?.errors
    ? Object.values(fetchError.data.errors)[0]?.[0]
    : undefined
  return firstFieldError ?? fetchError.data?.message ?? fallback
}

export function useAiProviderAccounts(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const { get, post, patch } = useApi()
  const { t } = useI18n()
  const enabled = computed(() => toValue(options.enabled ?? true))

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'settings-ai-provider-accounts',
    async () => {
      if (!enabled.value) {
        return { message: '', data: [] as Array<AiProviderAccount> }
      }
      return get<Array<AiProviderAccount>>('/api/settings/ai-provider-accounts')
    },
    { watch: [enabled] }
  )

  const accounts = computed(() => data.value?.data ?? [])

  async function create(payload: AiProviderAccountCreatePayload): Promise<AiProviderAccount | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await post<AiProviderAccount>('/api/settings/ai-provider-accounts', {
        ...payload
      })
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.ai.connections.saveError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function update(
    id: number,
    payload: AiProviderAccountUpdatePayload
  ): Promise<AiProviderAccount | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await patch<AiProviderAccount>(`/api/settings/ai-provider-accounts/${id}`, {
        ...payload
      })
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.ai.connections.saveError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function verify(id: number): Promise<AiVerifyResult | null> {
    submitting.value = true
    actionError.value = null
    try {
      const res = await post<AiVerifyResult>(`/api/settings/ai-provider-accounts/${id}/verify`, {})
      await refresh()
      return res.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.ai.connections.verifyError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function setDefault(id: number): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post(`/api/settings/ai-provider-accounts/${id}/default`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.ai.connections.defaultError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function archive(id: number): Promise<boolean> {
    submitting.value = true
    actionError.value = null
    try {
      await post(`/api/settings/ai-provider-accounts/${id}/archive`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('settings.ai.connections.archiveError'))
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
