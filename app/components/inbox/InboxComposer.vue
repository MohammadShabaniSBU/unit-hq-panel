<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiInboxMessage, InboxChannel } from '~/types/inbox'

const props = defineProps<{
  threadId: number
  channel: InboxChannel
  insertOptimisticMessage: (partial: {
    direction: 'outbound'
    body: ApiInboxMessage['body']
    fromAddress: string
    toAddress: string
  }) => number
  reconcileOptimisticMessage: (tempId: number, real: ApiInboxMessage | null) => void
}>()

const emit = defineEmits<{
  sent: []
}>()

const { t } = useI18n()

const threadIdRef = computed(() => props.threadId)
const channelRef = computed(() => props.channel)

const {
  context,
  pendingContext,
  bodyText,
  selectedTemplateId,
  stagedAttachments,
  uploading,
  sending,
  sendError,
  smsSegments,
  canSend,
  uploadAttachment,
  removeAttachment,
  insertToken,
  insertSnippet,
  sendReply
} = useInboxComposer(threadIdRef, channelRef)

const fileInput = ref<HTMLInputElement | null>(null)
const textareaRef = ref<{ textareaRef?: HTMLTextAreaElement } | null>(null)

const identityLabel = computed(() => context.value?.from_identity?.label
  ?? context.value?.from_identity?.address
  ?? context.value?.from_identity?.number
  ?? null)

const templateItems = computed(() => [
  { label: t('inbox.composer.template.none'), value: null },
  ...(context.value?.templates ?? []).map(template => ({ label: template.name, value: template.id }))
])

const tokenMenuItems = computed<Array<DropdownMenuItem[]>>(() => [
  (context.value?.tokens ?? []).map(token => ({
    label: token,
    onSelect: () => insertToken(token)
  }))
])

function triggerFileSelect() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) {
    return
  }

  await uploadAttachment(file)
}

function focusComposer() {
  const textarea = textareaRef.value?.textareaRef
  textarea?.focus()
}

defineExpose({ focus: focusComposer, insertSnippet })

async function handleSend() {
  if (!canSend.value) {
    return
  }

  const bodySnapshot = bodyText.value
  const fromAddress = context.value?.from_identity?.address
    ?? context.value?.from_identity?.number
    ?? ''

  const tempId = props.insertOptimisticMessage({
    direction: 'outbound',
    body: { format: 'text', content: bodySnapshot },
    fromAddress,
    toAddress: ''
  })

  const result = await sendReply(props.threadId)

  if (result) {
    props.reconcileOptimisticMessage(tempId, result.message)
    emit('sent')
  } else {
    props.reconcileOptimisticMessage(tempId, null)
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="shrink-0 border-t border-default p-3">
    <div
      v-if="channel === 'call'"
      class="flex items-center gap-2 rounded-lg border border-dashed border-default px-3 py-2.5 text-sm text-dimmed"
    >
      <UIcon
        name="i-lucide-phone-off"
        class="size-4"
      />
      {{ t('inbox.composer.callDisabled') }}
    </div>

    <div
      v-else-if="!pendingContext"
      class="flex flex-col gap-2"
    >
      <UAlert
        v-if="context && context.from_identity === null"
        color="warning"
        variant="subtle"
        :title="t('inbox.composer.identityMissing')"
        icon="i-lucide-alert-triangle"
      />

      <UAlert
        v-else-if="context?.suppression?.scope === 'all'"
        color="error"
        variant="subtle"
        :title="t('inbox.composer.suppressedAll')"
        icon="i-lucide-ban"
      />

      <UAlert
        v-else-if="context?.suppression?.scope === 'marketing'"
        color="warning"
        variant="subtle"
        :title="t('inbox.composer.suppressedMarketing')"
        icon="i-lucide-info"
      />

      <div
        v-if="identityLabel"
        class="flex items-center gap-1.5 text-xs text-dimmed"
      >
        <UIcon
          name="i-lucide-send"
          class="size-3"
        />
        {{ t('inbox.composer.fromIdentity', { identity: identityLabel }) }}
      </div>

      <div
        v-if="channel === 'email'"
        class="flex items-center gap-2"
      >
        <USelectMenu
          v-model="selectedTemplateId"
          :items="templateItems"
          value-key="value"
          size="xs"
          class="w-48"
          :placeholder="t('inbox.composer.template.label')"
        />

        <UDropdownMenu :items="tokenMenuItems">
          <UButton
            :label="t('inbox.composer.insertToken')"
            icon="i-lucide-braces"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>

        <UButton
          icon="i-lucide-paperclip"
          color="neutral"
          variant="ghost"
          size="xs"
          :loading="uploading"
          @click="triggerFileSelect"
        />
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          @change="onFileChange"
        >
      </div>

      <div
        v-if="stagedAttachments.length"
        class="flex flex-wrap gap-1.5"
      >
        <UBadge
          v-for="attachment in stagedAttachments"
          :key="attachment.id"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          <span class="max-w-32 truncate">{{ attachment.filename }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="xs"
            class="-me-1"
            :aria-label="t('inbox.composer.removeAttachment')"
            @click="removeAttachment(attachment.id)"
          />
        </UBadge>
      </div>

      <UTextarea
        ref="textareaRef"
        v-model="bodyText"
        :rows="3"
        autoresize
        :placeholder="channel === 'sms' ? t('inbox.composer.placeholderSms') : t('inbox.composer.placeholderEmail')"
        class="w-full"
        @keydown="onKeydown"
      />

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs text-dimmed">
          <span v-if="channel === 'sms' && smsSegments">
            {{ t('inbox.composer.smsSegments', { count: smsSegments.segments, chars: smsSegments.length }) }}
          </span>
          <span
            v-if="sendError"
            class="text-error"
          >{{ sendError }}</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[11px] text-dimmed">{{ t('inbox.composer.sendHint') }}</span>
          <UButton
            :label="t('inbox.composer.send')"
            icon="i-lucide-send"
            color="primary"
            size="sm"
            :loading="sending"
            :disabled="!canSend"
            @click="handleSend"
          />
        </div>
      </div>
    </div>
  </div>
</template>
