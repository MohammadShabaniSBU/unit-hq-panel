<script setup lang="ts">
import type { ApiInboxThreadSummary } from '~/types/inbox'

const props = defineProps<{
  thread: ApiInboxThreadSummary
  active: boolean
}>()

defineEmits<{
  select: [id: number]
}>()

const { formatRelativeActivity } = useContactFormatters()
const { t } = useI18n()

const channelIcon = computed(() => ({
  email: 'i-lucide-mail',
  sms: 'i-lucide-message-square',
  call: 'i-lucide-phone'
})[props.thread.channel])

const isUnread = computed(() => props.thread.unread_count > 0)

const title = computed(() =>
  props.thread.contact.name.trim()
  || props.thread.channel_key
  || props.thread.subject
  || t('inbox.row.unknownContact')
)

const previewText = computed(() => props.thread.preview?.body_excerpt ?? '')
const isOutboundPreview = computed(() => props.thread.preview?.direction === 'outbound')
const relativeTime = computed(() =>
  props.thread.last_message_at ? formatRelativeActivity(props.thread.last_message_at) : ''
)
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-2.5 border-b border-default px-3 py-2.5 text-left transition-colors"
    :class="active ? 'bg-primary/10' : 'hover:bg-elevated/60'"
    @click="$emit('select', thread.id)"
  >
    <div
      class="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      :class="isUnread ? 'bg-primary/15 text-primary' : 'bg-elevated text-dimmed'"
    >
      {{ thread.contact.avatar_initials || '—' }}
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span
          class="truncate text-sm"
          :class="isUnread ? 'font-semibold text-highlighted' : 'font-medium text-toned'"
        >
          {{ title }}
        </span>
        <span class="shrink-0 text-[11px] text-dimmed">
          {{ relativeTime }}
        </span>
      </div>

      <div class="mt-0.5 flex items-center gap-1">
        <UIcon
          v-if="isOutboundPreview"
          name="i-lucide-corner-up-right"
          class="size-3 shrink-0 text-dimmed"
        />
        <p
          class="truncate text-xs"
          :class="isUnread ? 'text-toned' : 'text-dimmed'"
        >
          {{ previewText || t('inbox.row.noPreview') }}
        </p>
      </div>

      <div class="mt-1.5 flex items-center gap-1.5">
        <UIcon
          :name="channelIcon"
          class="size-3.5 text-dimmed"
        />
        <UTooltip
          v-if="thread.suppressed"
          :text="t('inbox.row.suppressedTooltip')"
        >
          <UIcon
            name="i-lucide-ban"
            class="size-3.5 text-error"
          />
        </UTooltip>
        <span class="flex-1" />
        <UBadge
          v-if="thread.assigned_employee"
          :label="thread.assigned_employee.name"
          color="neutral"
          variant="subtle"
          size="xs"
          class="max-w-24 truncate"
        />
        <UBadge
          v-if="isUnread"
          :label="String(thread.unread_count)"
          color="primary"
          variant="solid"
          size="xs"
        />
      </div>
    </div>
  </button>
</template>
