<script setup lang="ts">
import type { InboxListMode } from '~/types/inbox'

const listMode = ref<InboxListMode>('threads')

const {
  channel,
  filter,
  unreadOnly,
  searchQuery,
  selectedThreadId,
  threads,
  pending: threadsPending,
  loadingMore,
  hasMore,
  newArrivalsCount,
  buildQuery,
  load: loadThreads,
  loadMore,
  mergeDelta: mergeThreadsDelta,
  revealNewArrivals,
  markReadLocally,
  assignThread,
  selectThread,
  selectAdjacent
} = useInboxThreads()

const {
  thread,
  messages,
  pending: threadPending,
  loadingOlder,
  hasOlder,
  loadOlder,
  mergeDelta: mergeThreadDetail,
  insertOptimisticMessage,
  reconcileOptimisticMessage
} = useInboxThread(selectedThreadId)

const {
  items: triageItems,
  selectedId: selectedTriageId,
  detail: triageDetail,
  pending: triagePending,
  loadingMore: triageLoadingMore,
  detailPending: triageDetailPending,
  resolving: triageResolving,
  hasMore: triageHasMore,
  load: loadTriage,
  loadMore: loadMoreTriage,
  select: selectTriage,
  attach: attachTriage,
  createAndAttach,
  discard: discardTriage
} = useInboxTriage()

const { dots: channelDots, refresh: refreshChannelDots } = useInboxChannelDots()
const { badge, refresh: refreshBadge } = useInboxBadge()
const { context, pending: contextPending, invalidate: invalidateContext } = useInboxContext(selectedThreadId)

function handleThreadsDelta(updated: Parameters<typeof mergeThreadsDelta>[0]) {
  mergeThreadsDelta(updated)
  if (updated.length > 0) {
    refreshChannelDots()
  }

  if (selectedThreadId.value !== null && updated.some(t => t.id === selectedThreadId.value)) {
    invalidateContext(selectedThreadId.value)
  }
}

const { start: startSync, stop: stopSync, pokeNow } = useInboxSync({
  selectedThreadId,
  buildListQuery: buildQuery,
  onThreadsDelta: handleThreadsDelta,
  onThreadDetail: mergeThreadDetail
})

const conversationPaneRef = ref<{ focusComposer: () => void, insertSnippet: (snippet: string) => void } | null>(null)
const toast = useToast()
const { t } = useI18n()
const { post } = useApi()

function handlePaymentInserted(url: string) {
  conversationPaneRef.value?.insertSnippet(url)
}

function handleSelect(id: number) {
  listMode.value = 'threads'
  selectThread(id)
}

async function handleAssign(employeeId: number | null) {
  if (selectedThreadId.value === null) {
    return
  }

  const assignee = await assignThread(selectedThreadId.value, employeeId)
  if (thread.value) {
    thread.value = { ...thread.value, assigned_employee: assignee }
  }
}

function handleSent() {
  pokeNow()
}

async function handleMarkUnread() {
  if (selectedThreadId.value === null) {
    return
  }

  try {
    await post<{ id: number, unread_count: number }>(
      `/api/inbox/threads/${selectedThreadId.value}/unread`,
      {}
    )
    const id = selectedThreadId.value
    const row = threads.value.find(item => item.id === id)
    if (row) {
      row.unread_count = 1
    }
    if (thread.value?.id === id) {
      thread.value = { ...thread.value, unread_count: 1 }
    }
    await refreshBadge()
    toast.add({ title: t('inbox.conversation.markedUnread'), color: 'success' })
  } catch {
    toast.add({ title: t('inbox.conversation.markUnreadError'), color: 'error' })
  }
}

function handleMoved(threadId: number) {
  selectThread(threadId)
  loadThreads()
  pokeNow()
}

watch(listMode, (mode) => {
  if (mode === 'triage') {
    selectThread(null)
    loadTriage()
  }
})

async function handleTriageAttach(contactId: number) {
  const result = await attachTriage(contactId)
  if (result) {
    await refreshBadge()
    listMode.value = 'threads'
    selectThread(result.message_thread_id)
    loadThreads()
    pokeNow()
    toast.add({ title: t('inbox.triage.attachSuccess'), color: 'success' })
  } else {
    toast.add({ title: t('inbox.triage.resolveError'), color: 'error' })
  }
}

async function handleTriageCreate(names: { first_name: string, last_name: string }) {
  const result = await createAndAttach(names)
  if (result) {
    await refreshBadge()
    listMode.value = 'threads'
    selectThread(result.message_thread_id)
    loadThreads()
    pokeNow()
    toast.add({ title: t('inbox.triage.createSuccess'), color: 'success' })
  } else {
    toast.add({ title: t('inbox.triage.resolveError'), color: 'error' })
  }
}

async function handleTriageDiscard(reason: string) {
  const result = await discardTriage(reason)
  if (result) {
    await refreshBadge()
    toast.add({ title: t('inbox.triage.discardSuccess'), color: 'success' })
  } else {
    toast.add({ title: t('inbox.triage.resolveError'), color: 'error' })
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function handleKeydown(event: KeyboardEvent) {
  if (isEditableTarget(event.target) || listMode.value === 'triage') {
    return
  }

  if (event.key === 'j') {
    event.preventDefault()
    selectAdjacent(1)
  } else if (event.key === 'k') {
    event.preventDefault()
    selectAdjacent(-1)
  } else if (event.key === 'Enter') {
    if (selectedThreadId.value === null && threads.value.length > 0) {
      event.preventDefault()
      selectThread(threads.value[0]?.id ?? null)
    }
  } else if (event.key === 'r') {
    event.preventDefault()
    conversationPaneRef.value?.focusComposer()
  }
}

watch(selectedThreadId, (id) => {
  if (id !== null && listMode.value === 'threads') {
    markReadLocally(id)
  }
})

onMounted(() => {
  loadThreads()
  refreshChannelDots()
  startSync()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  stopSync()
  window.removeEventListener('keydown', handleKeydown)
})

const listPending = computed(() =>
  listMode.value === 'triage' ? triagePending.value : threadsPending.value
)
const listLoadingMore = computed(() =>
  listMode.value === 'triage' ? triageLoadingMore.value : loadingMore.value
)
const listHasMore = computed(() =>
  listMode.value === 'triage' ? triageHasMore.value : hasMore.value
)
</script>

<template>
  <InboxLayout>
    <template #list>
      <InboxThreadList
        :list-mode="listMode"
        :threads="threads"
        :triage-items="triageItems"
        :pending="listPending"
        :loading-more="listLoadingMore"
        :has-more="listHasMore"
        :new-arrivals-count="newArrivalsCount"
        :selected-thread-id="selectedThreadId"
        :selected-triage-id="selectedTriageId"
        :channel="channel"
        :filter="filter"
        :unread-only="unreadOnly"
        :search-query="searchQuery"
        :channel-dots="channelDots"
        :triage-count="badge.triage_count"
        @update:list-mode="listMode = $event"
        @update:channel="channel = $event"
        @update:filter="filter = $event"
        @update:unread-only="unreadOnly = $event"
        @update:search-query="searchQuery = $event"
        @select="handleSelect"
        @select-triage="selectTriage"
        @load-more="listMode === 'triage' ? loadMoreTriage() : loadMore()"
        @reveal-new-arrivals="revealNewArrivals"
      />
    </template>

    <template #conversation>
      <InboxTriagePane
        v-if="listMode === 'triage'"
        :detail="triageDetail"
        :pending="triageDetailPending"
        :resolving="triageResolving"
        @attach="handleTriageAttach"
        @create-and-attach="handleTriageCreate"
        @discard="handleTriageDiscard"
      />
      <InboxConversationPane
        v-else
        ref="conversationPaneRef"
        :thread="thread"
        :messages="messages"
        :pending="threadPending"
        :loading-older="loadingOlder"
        :has-older="hasOlder"
        :insert-optimistic-message="insertOptimisticMessage"
        :reconcile-optimistic-message="reconcileOptimisticMessage"
        @load-older="loadOlder"
        @assign="handleAssign"
        @sent="handleSent"
        @mark-unread="handleMarkUnread"
        @moved="handleMoved"
      />
    </template>

    <template #context>
      <InboxContextPanel
        v-if="listMode === 'threads'"
        :context="context"
        :pending="contextPending"
        :thread-id="selectedThreadId"
        @payment-inserted="handlePaymentInserted"
        @invalidate="invalidateContext()"
      />
      <div
        v-else
        class="hidden w-80 shrink-0 border-l border-default lg:block"
      />
    </template>
  </InboxLayout>
</template>
