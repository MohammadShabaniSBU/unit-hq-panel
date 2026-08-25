<script setup lang="ts">
import type { DemoChatMessage } from '~/types/agents'

defineProps<{
  messages: Array<DemoChatMessage>
}>()

function isOutbound(message: DemoChatMessage): boolean {
  return message.role === 'assistant'
}

function sentChannel(message: DemoChatMessage) {
  if (!isOutbound(message) || message.streaming || message.blockedBy) {
    return null
  }

  const channel = message.channel
  if (!channel || typeof channel.detail.segments !== 'number' || !channel.detail.encoding) {
    return null
  }

  return channel
}

function metaClass(message: DemoChatMessage): string {
  const channel = sentChannel(message)
  if (!channel) {
    return 'text-dimmed'
  }
  if (channel.redrafted || channel.verdict === 'warn') {
    return 'text-warning'
  }
  return 'text-dimmed'
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
          message.blockedBy ? 'opacity-60' : '',
          sentChannel(message)?.redrafted ? 'ring-1 ring-warning/50' : ''
        ]"
      >
        <p
          class="whitespace-pre-wrap break-words"
          :class="message.blockedBy ? 'line-through' : ''"
        >
          {{ message.content }}
        </p>
        <div
          v-if="sentChannel(message)"
          class="mt-1 flex flex-wrap items-center gap-1 text-[11px]"
          :class="metaClass(message)"
        >
          <span>
            {{ $t('agents.channel.segments', {
              count: sentChannel(message)?.detail.segments,
              encoding: sentChannel(message)?.detail.encoding
            }) }}
          </span>
          <UBadge
            v-if="sentChannel(message)?.verdict === 'warn' && !sentChannel(message)?.redrafted"
            color="warning"
            variant="subtle"
            size="xs"
            :label="$t('agents.channel.warn')"
          />
          <UBadge
            v-if="sentChannel(message)?.redrafted"
            color="warning"
            variant="subtle"
            size="xs"
            :label="$t('agents.channel.redrafted')"
          />
          <UTooltip
            v-if="sentChannel(message)?.detail.gsm7_transliterated"
            :text="$t('agents.channel.originalDraftSession', {
              original: sentChannel(message)?.originalBody ?? ''
            })"
          >
            <UBadge
              color="neutral"
              variant="subtle"
              size="xs"
              :label="$t('agents.channel.transliterated')"
            />
          </UTooltip>
        </div>
        <DemoMessageStatus
          :consulting-tool-key="message.consultingToolKey"
          :blocked-by="message.blockedBy"
        />
      </div>
    </div>
  </div>
</template>
