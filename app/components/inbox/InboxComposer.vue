<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiInboxMessage, ApiWhatsappComposeTemplate, InboxChannel } from '~/types/inbox'
import type { WhatsappTemplateButton, WhatsappTemplateVariable } from '~/types/whatsapp-template'

const props = defineProps<{
  threadId: number
  channel: InboxChannel
  contactId?: number | null
  toNumber?: string | null
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
  consentMissing,
  windowOpen,
  countdownLabel,
  waStep,
  waTemplates,
  familyTemplates,
  selectedWaTemplate,
  waVariableFills,
  selectWaTemplate,
  clearWaTemplate,
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
  { label: t('inbox.composer.template.none'), value: null as number | null },
  ...familyTemplates.value.map(template => ({ label: template.name, value: template.id }))
])

const waTemplateGroups = computed(() => {
  const map = new Map<string, Array<ApiWhatsappComposeTemplate>>()
  for (const row of waTemplates.value) {
    const list = map.get(row.name) ?? []
    list.push(row)
    map.set(row.name, list)
  }
  return Array.from(map.entries()).map(([name, templates]) => ({
    name,
    templates: templates.sort((a, b) => a.language.localeCompare(b.language)),
    category: templates[0]?.category ?? 'utility'
  }))
})

const tokenMenuItems = computed<Array<DropdownMenuItem[]>>(() => [
  (context.value?.tokens ?? []).map(token => ({
    label: token,
    onSelect: () => insertToken(token)
  }))
])

const waPreviewVariables = computed<Array<WhatsappTemplateVariable>>(() =>
  (selectedWaTemplate.value?.variables ?? []).map(v => ({
    index: v.index,
    label: v.label,
    token_default: v.token_default,
    sample: v.sample
  }))
)

const waPreviewButtons = computed<Array<WhatsappTemplateButton> | null>(() => {
  const buttons = selectedWaTemplate.value?.buttons
  if (!buttons) {
    return null
  }
  return buttons.map(b => ({
    type: (b.type === 'url' ? 'url' : 'quick_reply') as 'url' | 'quick_reply',
    text: b.text,
    url: b.url
  }))
})

const showFreeform = computed(() => {
  if (props.channel === 'whatsapp') {
    return windowOpen.value && !countdownLabel.value?.expired
  }
  return props.channel !== 'call'
})

const showWaClosed = computed(() =>
  props.channel === 'whatsapp' && (!windowOpen.value || countdownLabel.value?.expired === true)
)

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

  const bodySnapshot = props.channel === 'whatsapp' && selectedWaTemplate.value
    ? selectedWaTemplate.value.body
    : bodyText.value
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

function categoryLabel(category: string): string {
  return t(`templates.whatsapp.category.${category}`, category)
}
</script>

<template>
  <div class="shrink-0 border-t border-default bg-default px-5 py-4">
    <div
      v-if="channel === 'call'"
      class="flex items-center gap-2 rounded-lg border border-dashed border-default px-3 py-2.5"
    >
      <CallsCallButton
        v-if="contactId"
        :contact-id="contactId"
        :to-number="toNumber"
        :context-type="'thread'"
        :context-id="threadId"
        :label="t('calls.callBack')"
        size="sm"
        color="primary"
        variant="soft"
      />
      <p
        v-else
        class="text-sm text-dimmed"
      >
        {{ t('inbox.composer.callDisabled') }}
      </p>
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
        v-else-if="consentMissing"
        color="error"
        variant="subtle"
        :title="t('inbox.composer.whatsappConsentMissing')"
        icon="i-lucide-ban"
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

      <!-- WhatsApp open window chip -->
      <div
        v-if="channel === 'whatsapp' && windowOpen && countdownLabel && !countdownLabel.expired"
        class="flex items-center gap-2"
      >
        <UBadge
          color="success"
          variant="subtle"
          size="sm"
        >
          {{ t('inbox.composer.whatsappFreeReplies', {
            hours: countdownLabel.hours,
            minutes: countdownLabel.minutes
          }) }}
        </UBadge>
      </div>

      <!-- Email / SMS template chrome -->
      <div
        v-if="channel === 'email' || channel === 'sms'"
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

        <UDropdownMenu
          v-if="channel === 'email' || !selectedTemplateId"
          :items="tokenMenuItems"
        >
          <UButton
            :label="t('inbox.composer.insertToken')"
            icon="i-lucide-braces"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>

        <UButton
          v-if="channel === 'email'"
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

      <!-- Free-form (email / SMS / WA open) -->
      <template v-if="showFreeform">
        <UTextarea
          v-if="channel !== 'sms' || !selectedTemplateId"
          ref="textareaRef"
          v-model="bodyText"
          :rows="3"
          autoresize
          :placeholder="channel === 'sms'
            ? t('inbox.composer.placeholderSms')
            : channel === 'whatsapp'
              ? t('inbox.composer.placeholderWhatsapp')
              : t('inbox.composer.placeholderEmail')"
          class="w-full"
          :ui="{ base: 'bg-muted ring-0' }"
          @keydown="onKeydown"
        />
        <p
          v-else
          class="rounded-md border border-default bg-elevated px-3 py-2 text-sm text-muted"
        >
          {{ t('inbox.composer.smsTemplateSelected', { name: familyTemplates.find(f => f.id === selectedTemplateId)?.name ?? '' }) }}
        </p>
      </template>

      <!-- WhatsApp closed: template picker + fill -->
      <template v-else-if="showWaClosed">
        <div
          v-if="waStep === 'choose'"
          class="space-y-2"
        >
          <p class="text-sm font-medium">
            {{ t('inbox.composer.whatsappChooseTemplate') }}
          </p>
          <p class="text-xs text-dimmed">
            {{ t('inbox.composer.whatsappWindowClosed') }}
          </p>
          <div
            v-if="waTemplateGroups.length === 0"
            class="rounded-md border border-dashed border-default px-3 py-4 text-center text-sm text-dimmed"
          >
            {{ t('inbox.composer.whatsappNoTemplates') }}
          </div>
          <button
            v-for="group in waTemplateGroups"
            :key="group.name"
            type="button"
            class="flex w-full items-center justify-between rounded-md border border-default px-3 py-2 text-left text-sm hover:bg-elevated"
            @click="selectWaTemplate(group.templates[0]!)"
          >
            <span class="font-medium">{{ group.name }}</span>
            <div class="flex items-center gap-1.5">
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ categoryLabel(group.category) }}
              </UBadge>
              <UBadge
                v-for="tpl in group.templates"
                :key="tpl.id"
                color="neutral"
                variant="outline"
                size="xs"
              >
                {{ tpl.language }}
              </UBadge>
            </div>
          </button>
        </div>

        <div
          v-else-if="selectedWaTemplate"
          class="grid gap-3 md:grid-cols-2"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium">
                {{ selectedWaTemplate.name }}
              </p>
              <UButton
                :label="t('inbox.composer.whatsappChangeTemplate')"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="clearWaTemplate"
              />
            </div>
            <div
              v-for="(variable, idx) in selectedWaTemplate.variables"
              :key="variable.index"
              class="space-y-1"
            >
              <label class="text-xs font-medium text-muted">
                {{ variable.label || t('inbox.composer.whatsappVariable', { index: variable.index }) }}
              </label>
              <UInput
                v-model="waVariableFills[idx]"
                size="sm"
              />
            </div>
          </div>
          <WhatsappTemplatesPhonePreview
            :header-text="selectedWaTemplate.header_text"
            :body="selectedWaTemplate.body"
            :footer-text="selectedWaTemplate.footer_text"
            :buttons="waPreviewButtons"
            :variables="waPreviewVariables"
            :fill-values="waVariableFills"
          />
        </div>
      </template>

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

        <div
          v-if="showFreeform || (showWaClosed && waStep === 'fill')"
          class="flex items-center gap-2"
        >
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
