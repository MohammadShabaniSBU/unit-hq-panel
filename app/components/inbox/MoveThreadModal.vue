<script setup lang="ts">
import type { ApiInboxMoveTarget } from '~/types/inbox'

const props = defineProps<{
  open: boolean
  targets: Array<ApiInboxMoveTarget>
  pending: boolean
  submitting: boolean
  channelSupportsNewThread: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [payload: { message_thread_id: number } | { new_thread: true }]
}>()

const { t } = useI18n()
const { formatRelativeActivity } = useContactFormatters()

const selection = ref<number | 'new' | null>(null)

watch(() => props.open, (open) => {
  if (open) {
    selection.value = props.targets[0]?.id ?? (props.channelSupportsNewThread ? 'new' : null)
  }
})

function targetLabel(target: ApiInboxMoveTarget): string {
  return target.subject?.trim()
    || target.channel_key?.trim()
    || t('inbox.move.untitled')
}

function confirm() {
  if (selection.value === null) {
    return
  }

  if (selection.value === 'new') {
    emit('confirm', { new_thread: true })
    return
  }

  emit('confirm', { message_thread_id: selection.value })
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('inbox.move.title')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-dimmed">
          {{ t('inbox.move.help') }}
        </p>

        <div
          v-if="pending"
          class="flex items-center justify-center py-8"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-dimmed"
          />
        </div>

        <div
          v-else
          class="flex flex-col gap-1"
        >
          <button
            v-for="target in targets"
            :key="target.id"
            type="button"
            class="flex w-full flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-colors"
            :class="selection === target.id
              ? 'border-primary bg-primary/5'
              : 'border-default hover:bg-elevated/60'"
            @click="selection = target.id"
          >
            <span class="text-sm font-medium text-highlighted">
              {{ targetLabel(target) }}
            </span>
            <span class="truncate text-xs text-dimmed">
              {{ target.preview_excerpt || t('inbox.move.noPreview') }}
              <template v-if="target.last_message_at">
                · {{ formatRelativeActivity(target.last_message_at) }}
              </template>
            </span>
          </button>

          <button
            v-if="channelSupportsNewThread"
            type="button"
            class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors"
            :class="selection === 'new'
              ? 'border-primary bg-primary/5'
              : 'border-default hover:bg-elevated/60'"
            @click="selection = 'new'"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4 text-dimmed"
            />
            <span class="text-sm font-medium text-highlighted">
              {{ t('inbox.move.newThread') }}
            </span>
          </button>

          <p
            v-if="targets.length === 0 && !channelSupportsNewThread"
            class="py-4 text-center text-sm text-dimmed"
          >
            {{ t('inbox.move.noTargets') }}
          </p>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('inbox.triage.cancel')"
          color="neutral"
          variant="ghost"
          @click="emit('update:open', false)"
        />
        <UButton
          :label="t('inbox.move.confirm')"
          color="primary"
          :disabled="selection === null || submitting"
          :loading="submitting"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
