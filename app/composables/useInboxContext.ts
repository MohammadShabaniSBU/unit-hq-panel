import type { ApiInboxContext } from '~/types/inbox'

/**
 * Context pane data source: per-thread cache over the live aggregate endpoint.
 * Quick actions and thread-delta sync invalidate a thread's entry so the next
 * selection (or an explicit refresh) re-fetches instead of showing stale figures.
 */
export function useInboxContext(threadId: Ref<number | null>) {
  const { get } = useApi()

  const cache = new Map<number, ApiInboxContext>()

  const context = ref<ApiInboxContext | null>(null)
  const pending = ref(false)
  const error = ref<unknown>(null)

  async function fetchContext(id: number, force = false) {
    if (!force && cache.has(id)) {
      context.value = cache.get(id) ?? null
      return
    }

    pending.value = true
    error.value = null

    try {
      const response = await get<ApiInboxContext>(`/api/inbox/threads/${id}/context`)
      cache.set(id, response.data)
      if (threadId.value === id) {
        context.value = response.data
      }
    } catch (err) {
      error.value = err
      if (threadId.value === id) {
        context.value = null
      }
    } finally {
      pending.value = false
    }
  }

  function invalidate(id?: number | null) {
    const target = id ?? threadId.value
    if (target === null || target === undefined) {
      return
    }

    cache.delete(target)
    if (threadId.value === target) {
      fetchContext(target, true)
    }
  }

  watch(
    threadId,
    (id) => {
      if (id !== null) {
        fetchContext(id)
      } else {
        context.value = null
      }
    },
    { immediate: true }
  )

  return {
    context,
    pending,
    error,
    invalidate
  }
}
