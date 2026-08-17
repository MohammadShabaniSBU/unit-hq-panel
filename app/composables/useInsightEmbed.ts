import type {
  InsightEmbedErrorKey,
  InsightEmbedPayload,
  InsightNavItem,
  InsightSiteScopeMode
} from '~/types/insights'

const REFRESH_LEAD_MS = 60_000

const MACHINE_KEYS = new Set<InsightEmbedErrorKey>([
  'account_archived',
  'credentials_unreadable',
  'site_required',
  'param_unresolved',
  'unknown_dynamic_key',
  'provider_not_embeddable',
  'report_is_native'
])

function mapEmbedError(err: unknown): InsightEmbedErrorKey {
  const fetchError = err as {
    statusCode?: number
    status?: number
    data?: { message?: string }
  }
  const status = fetchError.statusCode ?? fetchError.status
  const message = fetchError.data?.message

  if (status === 404) {
    return 'not_found'
  }

  if (status === 429 || message === 'errors.too_many_attempts') {
    return 'too_many_attempts'
  }

  if (typeof message === 'string' && MACHINE_KEYS.has(message as InsightEmbedErrorKey)) {
    return message as InsightEmbedErrorKey
  }

  return 'generic'
}

export function useInsightEmbed(
  key: MaybeRefOrGetter<string>,
  options: {
    siteScopeMode: MaybeRefOrGetter<InsightSiteScopeMode>
  }
) {
  const { post } = useApi()
  const siteContext = useSiteContextStore()

  const url = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)
  const pending = ref(false)
  const errorKey = ref<InsightEmbedErrorKey | null>(null)

  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  let pausedUntil: number | null = null
  let disposed = false

  function clearRefreshTimer() {
    if (refreshTimer != null) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
  }

  function scheduleRefresh() {
    clearRefreshTimer()
    if (disposed || !expiresAt.value) {
      return
    }

    const expiresMs = Date.parse(expiresAt.value)
    if (Number.isNaN(expiresMs)) {
      return
    }

    const delay = Math.max(expiresMs - REFRESH_LEAD_MS - Date.now(), 0)

    if (import.meta.client && document.visibilityState === 'hidden') {
      pausedUntil = expiresMs - REFRESH_LEAD_MS
      return
    }

    refreshTimer = setTimeout(() => {
      void mint()
    }, delay)
  }

  async function mint(): Promise<void> {
    if (disposed) {
      return
    }

    const reportKey = toValue(key)
    if (!reportKey) {
      return
    }

    pending.value = true
    errorKey.value = null

    const body: Record<string, unknown> = {}
    const siteId = siteContext.selectedSiteId
    if (typeof siteId === 'number') {
      body.site_id = siteId
    }

    try {
      const res = await post<InsightEmbedPayload>(`/api/insights/${reportKey}/embed`, body)
      if (disposed) {
        return
      }
      url.value = res.data.url
      expiresAt.value = res.data.expires_at
      scheduleRefresh()
    } catch (err: unknown) {
      if (disposed) {
        return
      }
      url.value = null
      expiresAt.value = null
      errorKey.value = mapEmbedError(err)
      clearRefreshTimer()

      if (errorKey.value === 'site_required') {
        siteContext.requestFocus()
      }
    } finally {
      if (!disposed) {
        pending.value = false
      }
    }
  }

  async function retry(): Promise<void> {
    await mint()
  }

  function onVisibilityChange() {
    if (!import.meta.client || disposed) {
      return
    }

    if (document.visibilityState === 'hidden') {
      if (expiresAt.value) {
        const expiresMs = Date.parse(expiresAt.value)
        if (!Number.isNaN(expiresMs)) {
          pausedUntil = expiresMs - REFRESH_LEAD_MS
        }
      }
      clearRefreshTimer()
      return
    }

    // Tab visible again — remint if near/past expiry, otherwise reschedule.
    const dueAt = pausedUntil
    pausedUntil = null
    if (dueAt != null && Date.now() >= dueAt) {
      void mint()
      return
    }
    scheduleRefresh()
  }

  watch(
    () => toValue(key),
    () => {
      void mint()
    },
    { immediate: true }
  )

  watch(
    () => siteContext.selectedSiteId,
    () => {
      if (toValue(options.siteScopeMode) !== 'inherit') {
        return
      }
      void mint()
    }
  )

  if (import.meta.client) {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  onUnmounted(() => {
    disposed = true
    clearRefreshTimer()
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return {
    url,
    expiresAt,
    pending,
    errorKey,
    mint,
    retry
  }
}

export type InsightEmbedReport = Pick<
  InsightNavItem,
  'key' | 'site_scope_mode' | 'options' | 'validation_status' | 'provider' | 'label' | 'label_source'
>
