import type {
  AnalyticsResource,
  DiscoveredParam,
  InsightResourceKind
} from '~/types/insights'

export type DiscoveryMode = 'list' | 'manual' | 'empty' | 'error'

function fetchErrorMessage(err: unknown): string {
  const fetchError = err as { data?: { message?: string }, statusCode?: number, status?: number }
  return fetchError.data?.message ?? ''
}

function fetchStatus(err: unknown): number {
  const fetchError = err as { statusCode?: number, status?: number, response?: { status?: number } }
  return fetchError.statusCode ?? fetchError.status ?? fetchError.response?.status ?? 0
}

export function useAnalyticsResources() {
  const { get } = useApi()

  const resources = ref<Array<AnalyticsResource>>([])
  const params = ref<Array<DiscoveredParam>>([])
  const mode = ref<DiscoveryMode>('list')
  const pending = ref(false)
  const paramsPending = ref(false)
  const error = ref<string | null>(null)

  async function fetchResources(
    accountId: number,
    kind: InsightResourceKind | string,
    refresh = false
  ): Promise<DiscoveryMode> {
    pending.value = true
    error.value = null
    resources.value = []

    try {
      const res = await get<Array<AnalyticsResource>>(
        `/api/settings/analytics-accounts/${accountId}/resources`,
        {
          kind,
          ...(refresh ? { refresh: 1 } : {})
        }
      )
      resources.value = res.data ?? []
      mode.value = resources.value.length === 0 ? 'empty' : 'list'
      return mode.value
    } catch (err: unknown) {
      const message = fetchErrorMessage(err)
      const status = fetchStatus(err)

      if (status === 409 && message === 'provider_not_discoverable') {
        mode.value = 'manual'
        return mode.value
      }

      mode.value = 'error'
      error.value = message || 'discovery_failed'
      return mode.value
    } finally {
      pending.value = false
    }
  }

  async function fetchParams(
    accountId: number,
    kind: InsightResourceKind | string,
    ref: string,
    refresh = false
  ): Promise<Array<DiscoveredParam>> {
    paramsPending.value = true
    params.value = []

    try {
      const res = await get<Array<DiscoveredParam>>(
        `/api/settings/analytics-accounts/${accountId}/resources/${kind}/${encodeURIComponent(ref)}/params`,
        refresh ? { refresh: 1 } : undefined
      )
      params.value = res.data ?? []
      return params.value
    } catch (err: unknown) {
      const message = fetchErrorMessage(err)
      const status = fetchStatus(err)

      if (status === 409 && message === 'provider_not_discoverable') {
        params.value = []
        return []
      }

      error.value = message || 'params_discovery_failed'
      return []
    } finally {
      paramsPending.value = false
    }
  }

  function reset() {
    resources.value = []
    params.value = []
    mode.value = 'list'
    error.value = null
  }

  return {
    resources,
    params,
    mode,
    pending,
    paramsPending,
    error,
    fetchResources,
    fetchParams,
    reset
  }
}
