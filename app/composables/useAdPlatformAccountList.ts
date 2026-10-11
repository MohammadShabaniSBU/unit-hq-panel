import type { AdPlatformAccount } from '~/types/advertising'

export function useAdPlatformAccountList() {
  const { get } = useApi()
  const accounts = ref<Array<AdPlatformAccount>>([])
  const pending = ref(false)
  const error = ref(false)

  async function refresh() {
    pending.value = true
    error.value = false
    try {
      const response = await get<Array<AdPlatformAccount>>('/api/ad-platform-accounts')
      accounts.value = response.data
    } catch {
      error.value = true
      accounts.value = []
    } finally {
      pending.value = false
    }
  }

  return {
    accounts,
    pending,
    error,
    refresh
  }
}
