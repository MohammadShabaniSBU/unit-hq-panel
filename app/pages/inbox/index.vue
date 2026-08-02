<script setup lang="ts">
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

const { dots: channelDots, refresh: refreshChannelDots } = useInboxChannelDots()

function handleThreadsDelta(updated: Parameters<typeof mergeThreadsDelta>[0]) {
  mergeThreadsDelta(updated)
  if (updated.length > 0) {
    refreshChannelDots()
  }
}

const { start: startSync, stop: stopSync, pokeNow } = useInboxSync({
  selectedThreadId,
  buildListQuery: buildQuery,
  onThreadsDelta: handleThreadsDelta,
  onThreadDetail: mergeThreadDetail
})

const conversationPaneRef = ref<{ focusComposer: () => void } | null>(null)

function handleSelect(id: number) {
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function handleKeydown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) {
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
  if (id !== null) {
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
</script>

<template>
  <InboxLayout>
    <template #list>
      <InboxThreadList
        :threads="threads"
        :pending="threadsPending"
        :loading-more="loadingMore"
        :has-more="hasMore"
        :new-arrivals-count="newArrivalsCount"
        :selected-thread-id="selectedThreadId"
        :channel="channel"
        :filter="filter"
        :unread-only="unreadOnly"
        :search-query="searchQuery"
        :channel-dots="channelDots"
        @update:channel="channel = $event"
        @update:filter="filter = $event"
        @update:unread-only="unreadOnly = $event"
        @update:search-query="searchQuery = $event"
        @select="handleSelect"
        @load-more="loadMore"
        @reveal-new-arrivals="revealNewArrivals"
      />
    </template>

    <template #conversation>
      <InboxConversationPane
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
      />
    </template>

    <template #context>
      <div class="hidden w-80 shrink-0 border-l border-default xl:block" />
    </template>
  </InboxLayout>
</template>
