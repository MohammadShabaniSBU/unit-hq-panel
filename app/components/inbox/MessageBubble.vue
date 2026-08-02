<script setup lang="ts">
import DOMPurify from 'dompurify'
import type { ApiInboxMessage } from '~/types/inbox'

const props = defineProps<{
  message: ApiInboxMessage
}>()

const { t, locale } = useI18n()
const { downloadingId, download } = useInboxAttachmentDownload()

const isOutbound = computed(() => props.message.direction === 'outbound')

const statusMeta = computed(() => {
  const map: Record<string, { label: string, color: 'neutral' | 'success' | 'primary' | 'error', icon: string }> = {
    queued: { label: t('inbox.status.queued'), color: 'neutral', icon: 'i-lucide-clock' },
    sent: { label: t('inbox.status.sent'), color: 'neutral', icon: 'i-lucide-check' },
    delivered: { label: t('inbox.status.delivered'), color: 'success', icon: 'i-lucide-check-check' },
    opened: { label: t('inbox.status.opened'), color: 'primary', icon: 'i-lucide-eye' },
    clicked: { label: t('inbox.status.clicked'), color: 'primary', icon: 'i-lucide-mouse-pointer-click' },
    bounced: { label: t('inbox.status.bounced'), color: 'error', icon: 'i-lucide-triangle-alert' },
    failed: { label: t('inbox.status.failed'), color: 'error', icon: 'i-lucide-circle-x' },
    spam: { label: t('inbox.status.spam'), color: 'error', icon: 'i-lucide-flag' }
  }

  return map[props.message.status] ?? null
})

const failureReason = computed(() => {
  if (props.message.status !== 'bounced' && props.message.status !== 'failed') {
    return null
  }

  const events = props.message.delivery_events ?? []
  const match = [...events].reverse().find(event => event.status === props.message.status)
  return match?.reason ?? null
})

const sourceBadge = computed(() => {
  const sourceRef = props.message.source_ref
  if (props.message.source === 'offer') {
    const offerId = sourceRef && typeof sourceRef.offer_id === 'number' ? sourceRef.offer_id : null
    return offerId !== null
      ? { label: t('inbox.source.offer', { id: offerId }), to: `/leasing/offers/${offerId}` }
      : { label: t('inbox.source.offerGeneric'), to: null }
  }

  if (props.message.source === 'playbook') {
    const runId = sourceRef && typeof sourceRef.automation_run_id === 'number' ? sourceRef.automation_run_id : null
    return runId !== null
      ? { label: t('inbox.source.playbookGeneric'), to: `/automations/${sourceRef?.automation_id ?? ''}/runs/${runId}` }
      : { label: t('inbox.source.playbookGeneric'), to: null }
  }

  if (props.message.source === 'automation') {
    const runId = sourceRef && typeof sourceRef.automation_run_id === 'number' ? sourceRef.automation_run_id : null
    return runId !== null
      ? { label: t('inbox.source.automationGeneric'), to: `/automations/${sourceRef?.automation_id ?? ''}/runs/${runId}` }
      : { label: t('inbox.source.automationGeneric'), to: null }
  }

  return null
})

const sanitizedHtml = computed(() => {
  if (props.message.body.format !== 'html' || !props.message.body.content) {
    return null
  }

  const html = props.message.body.content
  return import.meta.client ? DOMPurify.sanitize(html) : html
})

const sentAtLabel = computed(() => {
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
  <div
    class="flex"
    :class="isOutbound ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[70%] rounded-2xl px-3.5 py-2.5"
      :class="isOutbound ? 'bg-primary text-inverted' : 'bg-elevated text-highlighted'"
    >
      <div
        v-if="sourceBadge || message.rethreaded"
        class="mb-1.5 flex flex-wrap items-center gap-1"
      >
        <NuxtLink
          v-if="sourceBadge?.to"
          :to="sourceBadge.to"
        >
          <UBadge
            :label="sourceBadge.label"
            color="neutral"
            variant="subtle"
            size="xs"
          />
        </NuxtLink>
        <UBadge
          v-else-if="sourceBadge"
          :label="sourceBadge.label"
          color="neutral"
          variant="subtle"
          size="xs"
        />
        <UBadge
          v-if="message.rethreaded"
          :label="t('inbox.conversation.rethreaded')"
          color="warning"
          variant="subtle"
          size="xs"
          icon="i-lucide-move"
        />
      </div>

      <div
        v-if="sanitizedHtml"
        class="prose prose-sm max-w-none break-words [&_a]:underline"
        :class="isOutbound ? 'prose-invert' : ''"
        v-html="sanitizedHtml"
      />
      <p
        v-else
        class="whitespace-pre-wrap break-words text-sm"
      >
        {{ message.body.content }}
      </p>

      <ul
        v-if="message.attachments.length"
        class="mt-2 flex flex-col gap-1"
      >
        <li
          v-for="attachment in message.attachments"
          :key="attachment.id"
        >
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs underline-offset-2 hover:underline"
            :class="isOutbound ? 'text-inverted/90' : 'text-toned'"
            :disabled="downloadingId === attachment.id"
            @click="download(attachment.id, attachment.filename)"
          >
            <UIcon
              :name="downloadingId === attachment.id ? 'i-lucide-loader-circle' : 'i-lucide-paperclip'"
              class="size-3.5"
              :class="downloadingId === attachment.id ? 'animate-spin' : ''"
            />
            <span class="truncate">{{ attachment.filename }}</span>
            <span class="opacity-70">({{ formatFileSize(attachment.size) }})</span>
          </button>
        </li>
      </ul>

      <div
        class="mt-1.5 flex items-center gap-1.5"
        :class="isOutbound ? 'justify-end' : 'justify-start'"
      >
        <span
          class="text-[11px]"
          :class="isOutbound ? 'text-inverted/70' : 'text-dimmed'"
        >
          {{ sentAtLabel }}
        </span>

        <UTooltip
          v-if="isOutbound && statusMeta"
          :text="failureReason ?? statusMeta.label"
        >
          <span
            class="flex items-center gap-0.5 text-[11px]"
            :class="statusMeta.color === 'error' ? 'text-error' : (isOutbound ? 'text-inverted/70' : 'text-dimmed')"
          >
            <UIcon
              :name="statusMeta.icon"
              class="size-3"
            />
          </span>
        </UTooltip>
      </div>
    </div>
  </div>
</template>
