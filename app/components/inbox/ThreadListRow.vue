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
  whatsapp: 'i-lucide-message-circle',
  call: 'i-lucide-phone'
})[props.thread.channel])

const channelIconClass = computed(() => ({
  email: 'text-[#3B82F6]',
  sms: 'text-[#10B981]',
  whatsapp: 'text-[#25D366]',
  call: 'text-[#F59E0B]'
})[props.thread.channel])

const isUnread = computed(() => props.thread.unread_count > 0)

const rowClass = computed(() => {
  if (props.active) {
    return 'bg-ember-50 shadow-sm border-l-primary'
  }
  if (isUnread.value) {
    return 'bg-default border-l-primary hover:bg-elevated'
  }
  return 'border-l-transparent hover:bg-elevated'
})

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
    class="mb-1 flex w-full items-start gap-3 rounded-xl border-l-[3px] px-4 py-3.5 text-left transition-all"
    :class="rowClass"
    @click="$emit('select', thread.id)"
  >
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      :class="isUnread || active ? 'bg-primary' : 'bg-cosmos-800 text-cosmos-400'"
    >
      {{ thread.contact.avatar_initials || '—' }}
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span
          class="truncate text-sm"
          :class="isUnread || active ? 'font-semibold text-highlighted' : 'font-medium text-toned'"
        >
          {{ title }}
        </span>
        <span class="shrink-0 font-mono text-[10px] text-dimmed">
          {{ relativeTime }}
        </span>
      </div>

      <div class="mt-1 flex items-center gap-1.5">
        <UIcon
          :name="channelIcon"
          class="size-3.5 shrink-0"
          :class="channelIconClass"
        />
        <UIcon
          v-if="isOutboundPreview"
          name="i-lucide-corner-up-right"
          class="size-3 shrink-0 text-dimmed"
        />
        <p
          class="truncate text-xs"
          :class="isUnread || active ? 'text-toned' : 'text-dimmed'"
        >
          {{ previewText || t('inbox.row.noPreview') }}
        </p>
      </div>

      <div class="mt-2 flex items-center gap-1.5">
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
