<script setup lang="ts">
import { useCopilotStore } from '~/stores/copilot'

const { t } = useI18n()
const store = useCopilotStore()
const { formatDate } = useOrgDateFormat()

const sortedConversations = computed(() => {
  return [...store.conversations].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
    return bTime - aTime
  })
})

function formatConversationDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t('copilot.conversations.justNow')
  if (diffMins < 60) return t('copilot.conversations.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('copilot.conversations.hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('copilot.conversations.daysAgo', { count: diffDays })

  return formatDate(dateStr)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-3 border-b border-default">
      <UButton
        size="md"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        block
        @click="store.newConversation()"
      >
        {{ $t('copilot.conversations.newChat') }}
      </UButton>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-if="sortedConversations.length === 0"
        class="p-4 text-center text-muted text-sm"
      >
        {{ $t('copilot.conversations.empty') }}
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
          {{ formatConversationDate(conversation.updatedAt ?? conversation.createdAt) }}
        </div>
      </button>
    </div>
  </div>
</template>
