<script setup lang="ts">
import { useCopilotStore } from '~/stores/copilot'

const store = useCopilotStore()

const sortedConversations = computed(() => {
  return [...store.conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- New chat button -->
    <div class="p-3 border-b border-default">
      <UButton
        size="md"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        block
        @click="store.newConversation()"
      >
        New chat
      </UButton>
    </div>

    <!-- Conversations list -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="sortedConversations.length === 0" class="p-4 text-center text-muted text-sm">
        No conversations yet
      </div>

      <button
        v-for="conversation in sortedConversations"
        :key="conversation.id"
        class="w-full text-left px-4 py-3 border-b border-default hover:bg-elevated/50 transition-colors"
        :class="store.activeConversationId === conversation.id && 'bg-elevated'"
        @click="store.selectConversation(conversation.id)"
      >
        <div class="truncate font-medium text-sm">
          {{ conversation.title }}
        </div>
        <div class="text-xs text-muted mt-1">
          {{ formatDate(conversation.createdAt) }}
        </div>
      </button>
    </div>
  </div>
</template>
