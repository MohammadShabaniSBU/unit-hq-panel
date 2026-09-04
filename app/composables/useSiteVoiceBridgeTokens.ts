import type { ApiVoiceBridgeToken } from '~/types/voiceBridgeToken'

export function useSiteVoiceBridgeTokens(siteId: Ref<number> | ComputedRef<number>) {
  const { get, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()

  const { data, pending, error, refresh } = useAsyncData(
    () => `site-voice-bridge-tokens-${siteId.value}`,
    () => get<Array<ApiVoiceBridgeToken>>(
      `/api/sites/${siteId.value}/voice-bridge-tokens`
    ),
    { watch: [siteId] }
  )

  const tokens = computed(() => data.value?.data ?? [])

  async function revoke(item: ApiVoiceBridgeToken) {
    try {
      await post(`/api/sites/${siteId.value}/voice-bridge-tokens/${item.id}/revoke`, {})
      toast.add({
        title: t('facility.voiceBridgeTokens.revokeSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('facility.voiceBridgeTokens.revokeError'),
        color: 'error'
      })
      return false
    }
  }

  return {
    tokens,
    pending,
    error,
    refresh,
    revoke
  }
}
