<script setup lang="ts">
import type { ApiInboxMessage } from '~/types/inbox'

const props = defineProps<{
  message: ApiInboxMessage
}>()

const { t, locale } = useI18n()

const sourceRef = computed(() => props.message.source_ref ?? {})
const isOutbound = computed(() => props.message.direction === 'outbound')
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
</script>

<template>
  <div class="flex justify-center">
    <div class="flex w-full max-w-sm flex-col gap-2 rounded-xl border border-default bg-elevated/60 px-4 py-3">
      <div class="flex items-center gap-2">
        <UIcon
          :name="isOutbound ? 'i-lucide-phone-outgoing' : 'i-lucide-phone-incoming'"
          class="size-4 text-dimmed"
        />
        <span class="text-sm font-medium text-highlighted">
          {{ isOutbound ? t('inbox.call.outbound') : t('inbox.call.inbound') }}
        </span>
        <span class="ms-auto text-[11px] text-dimmed">{{ timeLabel }}</span>
      </div>

      <div class="flex items-center gap-1.5 text-xs text-dimmed">
        <span
          v-if="outcome"
          class="capitalize"
        >{{ outcome }}</span>
        <span v-if="outcome && duration">·</span>
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

      <UTooltip :text="t('inbox.call.callBackDisabledTooltip')">
        <UButton
          :label="t('inbox.call.callBack')"
          icon="i-lucide-phone"
          color="neutral"
          variant="soft"
          size="xs"
          disabled
          class="mt-1 self-start"
        />
      </UTooltip>
    </div>
  </div>
</template>
