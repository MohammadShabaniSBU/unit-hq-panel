import type { ApiInboxMessage, ApiInboxThreadDetail, ApiInboxThreadSummary } from '~/types/inbox'

let tempMessageSequence = 0

function toSummary(detail: ApiInboxThreadDetail): ApiInboxThreadSummary {
  const { messages: _messages, meta: _meta, ...summary } = detail
  return summary
}

function ascending(messages: Array<ApiInboxMessage>): Array<ApiInboxMessage> {
  return [...messages].reverse()
}

/**
 * Conversation pane: detail fetch (ascending render, newest-first pages per the
 * API contract), older-message pagination, mark-read on open, and the optimistic
 * outbound insert the composer reconciles on the next poll tick.
 */
export function useInboxThread(threadId: Ref<number | null>) {
  const { get, post } = useApi()

  const thread = ref<ApiInboxThreadSummary | null>(null)
  const messages = ref<Array<ApiInboxMessage>>([])
  const nextBefore = ref<string | null>(null)
  const pending = ref(false)
  const loadingOlder = ref(false)
  const error = ref<unknown>(null)

  const hasOlder = computed(() => nextBefore.value !== null)

  async function markRead(id: number) {
    try {
      await post(`/api/inbox/threads/${id}/read`, {})
      if (thread.value && thread.value.id === id) {
        thread.value = { ...thread.value, unread_count: 0 }
      }
    } catch {
      // Benign — a failed read-ack just leaves the badge stale until next poll.
    }
  }

  async function load(id: number) {
    pending.value = true
    error.value = null

    try {
      const response = await get<ApiInboxThreadDetail>(`/api/inbox/threads/${id}`)
      thread.value = toSummary(response.data)
      messages.value = ascending(response.data.messages)
      nextBefore.value = response.data.meta.next_before
      await markRead(id)
    } catch (err) {
      error.value = err
    } finally {
      pending.value = false
    }
  }

  async function loadOlder() {
    if (!thread.value || !nextBefore.value || loadingOlder.value) {
      return
    }

    loadingOlder.value = true
    try {
      const response = await get<ApiInboxThreadDetail>(`/api/inbox/threads/${thread.value.id}`, {
        before: nextBefore.value
      })
      messages.value = [...ascending(response.data.messages), ...messages.value]
      nextBefore.value = response.data.meta.next_before
    } finally {
      loadingOlder.value = false
    }
  }

  /**
   * Poll delta for the open thread: update thread metadata + merge any messages
   * the poller surfaced (an inbound reply must appear within one cycle unrefreshed).
   */
  function mergeDelta(detail: ApiInboxThreadDetail) {
    if (!thread.value || detail.id !== thread.value.id) {
      return
    }

    thread.value = toSummary(detail)

    const incoming = ascending(detail.messages)
    const existingIds = new Set(messages.value.map(m => m.id))
    const updatedById = new Map(incoming.map(m => [m.id, m]))

    const merged = messages.value.map(m => updatedById.get(m.id) ?? m)
    const arrivals = incoming.filter(m => !existingIds.has(m.id))

    messages.value = arrivals.length > 0
      ? [...merged, ...arrivals].sort((a, b) => a.id - b.id)
      : merged
  }

  function insertOptimisticMessage(partial: {
    direction: 'outbound'
    body: ApiInboxMessage['body']
    fromAddress: string
    toAddress: string
  }): number {
    const tempId = --tempMessageSequence

    const optimistic: ApiInboxMessage = {
      id: tempId,
      direction: 'outbound',
      status: 'queued',
      body: partial.body,
      attachments: [],
      source: 'manual',
      source_ref: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      delivery_events: null,
      from_address: partial.fromAddress,
      to_address: partial.toAddress,
      rethreaded: false,
      rethreaded_from_thread_id: null
    }

    messages.value = [...messages.value, optimistic]
    return tempId
  }

  function reconcileOptimisticMessage(tempId: number, real: ApiInboxMessage | null) {
    messages.value = real !== null
      ? messages.value.map(m => (m.id === tempId ? real : m))
      : messages.value.filter(m => m.id !== tempId)
  }

  watch(
    threadId,
    (id) => {
      if (id !== null) {
        load(id)
      } else {
        thread.value = null
        messages.value = []
        nextBefore.value = null
      }
    },
    { immediate: true }
  )

  return {
    thread,
    messages,
    pending,
    loadingOlder,
    hasOlder,
    error,
    load,
    loadOlder,
    mergeDelta,
    insertOptimisticMessage,
    reconcileOptimisticMessage
  }
}
