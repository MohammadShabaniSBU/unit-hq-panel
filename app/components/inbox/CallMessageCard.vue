<script setup lang="ts">
import type { ApiInboxMessage } from '~/types/inbox'

const props = defineProps<{
  message: ApiInboxMessage
  contactId?: number | null
  threadId?: number | null
  toNumber?: string | null
}>()

const { t, locale } = useI18n()

const sourceRef = computed(() => props.message.source_ref ?? {})
const isOutbound = computed(() => props.message.direction === 'outbound')
const isVoicemail = computed(() => sourceRef.value.outcome === 'voicemail')
const duration = computed(() => {
  const value = sourceRef.value.duration
  return typeof value === 'number' && value > 0 ? value : null
})
const outcome = computed(() => {
  const value = sourceRef.value.outcome
  return typeof value === 'string' && value !== '' ? value : null
})
const recordingUrl = computed(() => {
  const value = sourceRef.value.recording_url ?? sourceRef.value.voicemail_url
  return typeof value === 'string' && value !== '' ? value : null
})

const timeLabel = computed(() => {
  const at = props.message.sent_at ?? props.message.created_at
  if (!at) {
    return ''
  }

  return new Date(at).toLocaleTimeString(locale.value === 'es' ? 'es-ES' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

const directionIcon = computed(() => {
  if (isVoicemail.value) {
    return 'i-lucide-voicemail'
  }
  return isOutbound.value ? 'i-lucide-phone-outgoing' : 'i-lucide-phone-incoming'
})

const directionLabel = computed(() => {
  if (isVoicemail.value) {
    return t('calls.voicemail')
  }
  return isOutbound.value ? t('inbox.call.outbound') : t('inbox.call.inbound')
})
</script>

<template>
  <div class="flex justify-center">
    <div
      class="flex w-full max-w-sm flex-col gap-2 rounded-xl border px-4 py-3"
      :class="isVoicemail
        ? 'border-warning/40 bg-warning/5'
        : 'border-default bg-elevated/60'"
    >
      <div class="flex items-center gap-2">
        <UIcon
          :name="directionIcon"
          class="size-4"
          :class="isVoicemail ? 'text-warning' : 'text-dimmed'"
        />
        <span class="text-sm font-medium text-highlighted">
          {{ directionLabel }}
        </span>
        <span class="ms-auto text-[11px] text-dimmed">{{ timeLabel }}</span>
      </div>

      <div class="flex items-center gap-1.5 text-xs text-dimmed">
        <span
          v-if="outcome && !isVoicemail"
          class="capitalize"
        >{{ outcome }}</span>
        <span v-if="outcome && !isVoicemail && duration">·</span>
        <span v-if="duration">{{ t('inbox.call.durationSeconds', { count: duration }) }}</span>
      </div>

      <a
        v-if="recordingUrl"
        :href="recordingUrl"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <UIcon
          name="i-lucide-play-circle"
          class="size-3.5"
        />
        {{ t('inbox.call.recording') }}
      </a>
      <p
        v-else
        class="text-xs text-dimmed"
      >
        {{ t('inbox.call.noRecording') }}
      </p>

      <CallsCallButton
        v-if="contactId"
        class="mt-1 self-start"
        :contact-id="contactId"
        :to-number="toNumber"
        :context-type="'thread'"
        :context-id="threadId"
        :label="t('calls.callBack')"
        size="xs"
        color="neutral"
        variant="soft"
      />
    </div>
  </div>
</template>
