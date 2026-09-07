<script setup lang="ts">
import type { ApiCommsTriageSummary } from '~/types/inbox'

const props = defineProps<{
  item: ApiCommsTriageSummary
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
})[props.item.channel])

const title = computed(() =>
  props.item.preview.from?.trim()
  || props.item.sender_value
  || t('inbox.triage.unknownSender')
)

const previewText = computed(() =>
  props.item.preview.subject?.trim()
  || props.item.preview.body_text?.trim()
  || t('inbox.triage.noPreview')
)

const relativeTime = computed(() =>
  props.item.created_at ? formatRelativeActivity(props.item.created_at) : ''
)
</script>

<template>
  <button
    type="button"
    class="mb-1 flex w-full items-start gap-3 rounded-xl border-l-[3px] px-4 py-3.5 text-left transition-all"
    :class="active
      ? 'border-l-primary bg-ember-50 shadow-sm'
      : 'border-l-transparent hover:bg-elevated'"
    @click="$emit('select', item.id)"
  >
    <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
      <UIcon
        name="i-lucide-circle-help"
        class="size-4"
      />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-semibold text-highlighted">
          {{ title }}
        </span>
        <span class="shrink-0 text-[11px] text-dimmed">
          {{ relativeTime }}
        </span>
      </div>

      <p class="mt-0.5 truncate text-xs text-toned">
        {{ previewText }}
      </p>

      <div class="mt-1.5 flex items-center gap-1.5">
        <UIcon
          :name="channelIcon"
          class="size-3.5 text-dimmed"
        />
        <span class="truncate text-[11px] text-dimmed">
          {{ item.sender_value }}
        </span>
      </div>
    </div>
  </button>
</template>
