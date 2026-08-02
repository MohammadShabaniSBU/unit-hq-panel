import type { ApiAccessEvent } from '~/types/access'

export interface AccessEventFilters {
  site_id?: number | null
  access_point_id?: number | null
  contact_id?: number | null
  denied_only?: boolean
  from?: string | null
  to?: string | null
}

export function useAccessEvents(options: {
  url: MaybeRefOrGetter<string>
  filters?: MaybeRefOrGetter<AccessEventFilters>
}) {
  const { getCursor } = useApi()

  const events = ref<Array<ApiAccessEvent>>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const loadingMore = ref(false)
  const error = ref<unknown>(null)

  const hasMore = computed(() => nextCursor.value !== null)

  function buildQuery(cursor?: string | null): Record<string, string | number> {
    const filters = toValue(options.filters) ?? {}
    const query: Record<string, string | number> = { per_page: 50 }

    if (cursor) {
      query.cursor = cursor
    }
    if (filters.site_id != null) {
      query.site_id = filters.site_id
    }
    if (filters.access_point_id != null) {
      query.access_point_id = filters.access_point_id
    }
    if (filters.contact_id != null) {
      query.contact_id = filters.contact_id
    }
    if (filters.denied_only) {
      query.denied_only = 1
    }
    if (filters.from) {
      query.from = filters.from
    }
    if (filters.to) {
      query.to = filters.to
    }

    return query
  }

  async function refresh() {
    pending.value = true
    error.value = null
    try {
      const response = await getCursor<ApiAccessEvent>(toValue(options.url), buildQuery())
      events.value = response.data ?? []
      nextCursor.value = response.meta?.next_cursor ?? null
    } catch (err: unknown) {
      error.value = err
      events.value = []
      nextCursor.value = null
    } finally {
      pending.value = false
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) {
      return
    }
    loadingMore.value = true
    try {
      const response = await getCursor<ApiAccessEvent>(
        toValue(options.url),
        buildQuery(nextCursor.value)
      )
      const incoming = response.data ?? []
      const seen = new Set(events.value.map(e => e.id))
      events.value = [
        ...events.value,
        ...incoming.filter(e => !seen.has(e.id))
      ]
      nextCursor.value = response.meta?.next_cursor ?? null
    } catch (err: unknown) {
      error.value = err
    } finally {
      loadingMore.value = false
    }
  }

  watch(
    () => [toValue(options.url), JSON.stringify(toValue(options.filters) ?? {})],
    () => {
      void refresh()
    },
    { immediate: true }
  )

  return {
    events,
    pending,
    loadingMore,
    error,
    hasMore,
    refresh,
    loadMore
  }
}
