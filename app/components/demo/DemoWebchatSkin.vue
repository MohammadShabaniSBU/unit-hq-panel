<script setup lang="ts">
import type { DemoChatMessage } from '~/types/agents'

defineProps<{
  messages: Array<DemoChatMessage>
}>()

function isOutbound(message: DemoChatMessage): boolean {
  return message.role === 'assistant'
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-default bg-default p-3">
    <div
      v-for="message in messages"
      :key="String(message.id)"
      class="flex"
      :class="isOutbound(message) ? 'justify-start' : 'justify-end'"
    >
      <div
        class="max-w-[92%] rounded-xl px-2.5 py-1.5 text-sm"
        :class="[
          isOutbound(message) ? 'bg-elevated text-highlighted' : 'bg-primary text-inverted',
          message.blockedBy ? 'opacity-60' : ''
        ]"
      >
        <p
          class="whitespace-pre-wrap break-words"
          :class="message.blockedBy ? 'line-through' : ''"
        >
          {{ message.content }}
        </p>
        <DemoMessageStatus
          :consulting-tool-key="message.consultingToolKey"
          :blocked-by="message.blockedBy"
        />
      </div>
    </div>
  </div>
</template>
