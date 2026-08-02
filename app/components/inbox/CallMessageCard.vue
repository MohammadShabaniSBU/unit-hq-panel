<script setup lang="ts">
import type { ApiCallWrapup, ApiInboxMessage, CallDisposition } from '~/types/inbox'

const props = defineProps<{
  message: ApiInboxMessage
  contactId?: number | null
  threadId?: number | null
  toNumber?: string | null
}>()

const emit = defineEmits<{
  wrapupUpdated: [wrapup: ApiCallWrapup]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { dispositions, saveWrapup } = useCallWrapup()
const { loadingId, loadRecording } = useCallRecording()

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
const hasRecording = computed(() => props.message.has_recording === true)
const wrapup = computed(() => props.message.wrapup ?? null)

const audioUrl = ref<string | null>(null)
const recordingError = ref(false)
const editOpen = ref(false)
const editDisposition = ref<CallDisposition | null>(null)
const editNote = ref('')
const saving = ref(false)

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

const menuItems = computed(() => [[
  {
    label: t('calls.wrapup.edit'),
    icon: 'i-lucide-pencil',
    onSelect: openEdit
  }
]])

function dispositionLabel(key: string): string {
  const i18nKey = `calls.dispositions.${key}`
  const translated = t(i18nKey)
  return translated !== i18nKey ? translated : key
}

async function onPlay() {
  if (audioUrl.value || recordingError.value) {
    return
  }

  try {
    audioUrl.value = await loadRecording(props.message.id)
  } catch {
    recordingError.value = true
  }
}

function openEdit() {
  editDisposition.value = wrapup.value?.disposition ?? null
  editNote.value = wrapup.value?.note ?? ''
  editOpen.value = true
}

async function onSaveEdit() {
  saving.value = true
  try {
    const result = await saveWrapup(props.message.id, {
      disposition: editDisposition.value,
      note: editNote.value || null
    })
    emit('wrapupUpdated', result)
    editOpen.value = false
    toast.add({ title: t('calls.wrapup.saved'), color: 'success' })
  } catch {
    toast.add({ title: t('calls.wrapup.saveError'), color: 'error' })
  } finally {
    saving.value = false
  }
}
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
        <UBadge
          v-if="wrapup?.disposition"
          :label="dispositionLabel(wrapup.disposition)"
          :color="wrapup.disposition === 'payment_promised' ? 'success' : 'neutral'"
          variant="subtle"
          size="xs"
        />
        <span class="ms-auto text-[11px] text-dimmed">{{ timeLabel }}</span>
        <UDropdownMenu :items="menuItems">
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('calls.wrapup.menuAria')"
          />
        </UDropdownMenu>
      </div>

      <div class="flex items-center gap-1.5 text-xs text-dimmed">
        <span
          v-if="outcome && !isVoicemail"
          class="capitalize"
        >{{ outcome }}</span>
        <span v-if="outcome && !isVoicemail && duration">·</span>
        <span v-if="duration">{{ t('inbox.call.durationSeconds', { count: duration }) }}</span>
      </div>

      <p
        v-if="wrapup?.note"
        class="text-xs text-muted"
      >
        {{ wrapup.note }}
      </p>

      <div
        v-if="hasRecording"
        class="flex flex-col gap-1.5"
      >
        <UButton
          v-if="!audioUrl && !recordingError"
          :label="t('inbox.call.recording')"
          icon="i-lucide-play-circle"
          size="xs"
          color="primary"
          variant="soft"
          class="self-start"
          :loading="loadingId === message.id"
          @click="onPlay"
        />
        <audio
          v-if="audioUrl"
          :src="audioUrl"
          controls
          class="w-full"
          preload="metadata"
        />
        <p
          v-if="recordingError"
          class="text-xs text-dimmed"
        >
          {{ t('inbox.call.recordingUnavailable') }}
        </p>
      </div>
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

    <UModal
      v-model:open="editOpen"
      :title="t('calls.wrapup.editTitle')"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="key in dispositions"
              :key="key"
              size="xs"
              :color="editDisposition === key ? 'primary' : 'neutral'"
              :variant="editDisposition === key ? 'solid' : 'soft'"
              :label="dispositionLabel(key)"
              @click="editDisposition = key"
            />
          </div>
          <UTextarea
            v-model="editNote"
            :placeholder="t('calls.wrapup.notePlaceholder')"
            :rows="3"
            autoresize
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="editOpen = false"
          />
          <UButton
            :label="t('calls.wrapup.save')"
            color="primary"
            :loading="saving"
            @click="onSaveEdit"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
