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
  <div class="mx-auto flex w-full max-w-md flex-col gap-2">
    <div class="flex justify-center">
      <UBadge
        color="neutral"
        variant="subtle"
        size="xs"
        :label="$t('demo.chat.whatsappAdvisory')"
      />
    </div>
    <div
      v-for="message in messages"
      :key="String(message.id)"
      class="flex"
      :class="isOutbound(message) ? 'justify-start' : 'justify-end'"
    >
      <div
        class="max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm"
        :class="[
          isOutbound(message) ? 'rounded-bl-sm bg-elevated text-highlighted' : 'rounded-br-sm bg-primary text-inverted',
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
