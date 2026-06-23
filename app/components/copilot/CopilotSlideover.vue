<script setup lang="ts">
import { useCopilotStore } from '~/stores/copilot'

const store = useCopilotStore()

const handleBackdropClick = () => {
  store.close()
}

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    store.close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <USlideover
    v-model:open="store.isOpen"
    side="bottom"
    :close="false"
    :ui="{
      body: 'h-full p-0 m-0'
    }"
    :class="{ 'h-3/4': store.isOpen }"
    class="p-0"
  >
    <template #content>
      <div class="flex min-h-0 flex-1 overflow-hidden h-full">
        <!-- Left panel - Conversation list -->
        <div class="w-64 shrink-0 border-r border-default bg-default overflow-hidden flex flex-col">
          <CopilotConversationList />
        </div>

        <!-- Right panel - Chat -->
        <div class="flex-1 bg-default overflow-hidden flex flex-col">
            <CopilotChatPanel />
        </div>
      </div>
    </template>
  </USlideover>
</template>
