<script setup lang="ts">
import type { ChannelGuardDetail, DemoChatMessage } from '~/types/agents'

const props = defineProps<{
  messages: Array<DemoChatMessage>
  channelGuardDetail: ChannelGuardDetail | null
}>()

function isOutbound(message: DemoChatMessage): boolean {
  return message.role === 'assistant'
}

function assistantSegments(message: DemoChatMessage): string | null {
  if (!isOutbound(message) || message.streaming || !props.channelGuardDetail) {
    return null
  }

  const segments = props.channelGuardDetail.segments
  const encoding = props.channelGuardDetail.encoding
  if (typeof segments !== 'number' || !encoding) {
    return null
  }

  return String(segments)
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-col gap-2">
    <div
      v-for="message in messages"
      :key="String(message.id)"
      class="flex"
      :class="isOutbound(message) ? 'justify-start' : 'justify-end'"
    >
      <div
        class="max-w-[90%] rounded-2xl px-3 py-2 text-sm"
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
        <p
          v-if="assistantSegments(message)"
          class="mt-1 text-[11px] text-dimmed"
        >
          {{ $t('demo.chat.segments', {
            count: channelGuardDetail?.segments,
            encoding: channelGuardDetail?.encoding
          }) }}
        </p>
        <DemoMessageStatus
          :consulting-tool-key="message.consultingToolKey"
          :blocked-by="message.blockedBy"
        />
      </div>
    </div>
  </div>
</template>
