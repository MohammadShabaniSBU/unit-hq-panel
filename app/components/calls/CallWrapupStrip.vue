<script setup lang="ts">
import type { ApiPendingWrapup, CallDisposition } from '~/types/inbox'

const { t } = useI18n()
const toast = useToast()
const { badge, refresh } = useInboxBadge()
const { dispositions, saveWrapup, dismissWrapup } = useCallWrapup()

const pending = computed(() => badge.value.pending_wrapups ?? [])

const noteByMessage = reactive<Record<number, string>>({})
const selectedByMessage = reactive<Record<number, CallDisposition | null>>({})
const savingId = ref<number | null>(null)

function titleFor(item: ApiPendingWrapup): string {
  if (item.contact) {
    return t('calls.wrapup.titleWith', { name: item.contact.name })
  }
  return t('calls.wrapup.titleNumber', { number: item.number })
}

function dispositionLabel(key: CallDisposition): string {
  return t(`calls.dispositions.${key}`)
}

async function onSave(item: ApiPendingWrapup) {
  const disposition = selectedByMessage[item.message_id] ?? null
  if (!disposition) {
    toast.add({ title: t('calls.wrapup.dispositionRequired'), color: 'warning' })
    return
  }

  savingId.value = item.message_id
  try {
    await saveWrapup(item.message_id, {
      disposition,
      note: noteByMessage[item.message_id] || null
    })
    toast.add({ title: t('calls.wrapup.saved'), color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: t('calls.wrapup.saveError'), color: 'error' })
  } finally {
    savingId.value = null
  }
}

async function onDismiss(item: ApiPendingWrapup) {
  savingId.value = item.message_id
  try {
    await dismissWrapup(item.message_id)
    await refresh()
  } catch {
    toast.add({ title: t('calls.wrapup.saveError'), color: 'error' })
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div
    v-if="pending.length > 0"
    class="border-b border-warning/20 bg-warning/10"
  >
    <div
      v-for="(item, index) in pending"
      :key="item.message_id"
      class="flex flex-col gap-2 px-4 py-3"
      :class="index > 0 ? 'border-t border-warning/10' : ''"
    >
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <UIcon
          name="i-lucide-clipboard-pen"
          class="size-4 shrink-0 text-warning"
        />
        <span class="font-medium text-highlighted">
          {{ titleFor(item) }}
        </span>
        <span class="text-xs text-dimmed">
          {{ t('calls.wrapup.promptHint') }}
        </span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="key in dispositions"
          :key="key"
          size="xs"
          :color="selectedByMessage[item.message_id] === key ? 'primary' : 'neutral'"
          :variant="selectedByMessage[item.message_id] === key ? 'solid' : 'soft'"
          :label="dispositionLabel(key)"
          @click="selectedByMessage[item.message_id] = key"
        />
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <UTextarea
          v-model="noteByMessage[item.message_id]"
          :placeholder="t('calls.wrapup.notePlaceholder')"
          :rows="2"
          class="min-w-[16rem] flex-1"
          autoresize
        />
        <UButton
          :label="t('calls.wrapup.save')"
          size="sm"
          color="primary"
          :loading="savingId === item.message_id"
          @click="onSave(item)"
        />
        <UButton
          :label="t('calls.wrapup.dismiss')"
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="savingId === item.message_id"
          @click="onDismiss(item)"
        />
      </div>
    </div>
  </div>
</template>
