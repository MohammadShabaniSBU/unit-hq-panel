<script setup lang="ts">
import DOMPurify from 'dompurify'
import type { DemoChatMessage } from '~/types/agents'

defineProps<{
  messages: Array<DemoChatMessage>
}>()

function sanitized(content: string): string {
  return import.meta.client ? DOMPurify.sanitize(content) : content
}

function isAssistant(message: DemoChatMessage): boolean {
  return message.role === 'assistant'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <article
      v-for="message in messages"
      :key="String(message.id)"
      class="rounded-lg border border-default bg-default p-4"
      :class="message.blockedBy ? 'opacity-60' : ''"
    >
      <p class="mb-2 text-[11px] font-medium uppercase tracking-wide text-dimmed">
        {{ isAssistant(message) ? $t('demo.chat.assistant') : $t('demo.chat.operator') }}
      </p>
      <p
        v-if="isAssistant(message) && message.subject"
        class="mb-2 text-sm font-semibold text-highlighted"
      >
        {{ $t('demo.chat.subject') }}: {{ message.subject }}
      </p>
      <div
        v-if="isAssistant(message) && message.content"
        class="prose prose-sm max-w-none break-words [&_a]:underline"
        :class="message.blockedBy ? 'line-through' : ''"
        v-html="sanitized(message.content)"
      />
      <p
        v-else
        class="whitespace-pre-wrap break-words text-sm"
        :class="message.blockedBy ? 'line-through text-dimmed' : 'text-highlighted'"
      >
        {{ message.content }}
      </p>
      <DemoMessageStatus
        :consulting-tool-key="message.consultingToolKey"
        :blocked-by="message.blockedBy"
      />
    </article>
  </div>
</template>
