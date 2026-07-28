import type { ApiSiteStripeSetting } from '~/types/stripe'

export function useSiteStripeSettings(siteId: Ref<number>) {
  const { get, put, post, del } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    () => `site-stripe-settings-${siteId.value}`,
    () => get<ApiSiteStripeSetting>(`/api/sites/${siteId.value}/stripe-settings`),
    { watch: [siteId] }
  )

  const setting = computed(() => data.value?.data ?? null)

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function saveKeys(publishableKey: string, secretKey: string) {
    submitting.value = true
    actionError.value = null

    try {
      await put<ApiSiteStripeSetting>(`/api/sites/${siteId.value}/stripe-settings`, {
        publishable_key: publishableKey || null,
        secret_key: secretKey
      })
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('forms.stripe.saveErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function createWebhook() {
    submitting.value = true
    actionError.value = null

    try {
      await post<ApiSiteStripeSetting>(`/api/sites/${siteId.value}/stripe-settings/webhook`, {})
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('forms.stripe.webhookErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function disconnect() {
    submitting.value = true
    actionError.value = null

    try {
      await del(`/api/sites/${siteId.value}/stripe-settings`)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('forms.stripe.disconnectErrorMessage'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    setting,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    saveKeys,
    createWebhook,
    disconnect
  }
}
