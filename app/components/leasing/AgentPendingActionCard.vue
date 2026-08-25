<script setup lang="ts">
import type { AgentConversationMessage, AgentPendingAction } from '~/types/agents'
import {
  minutesUntil,
  pendingResultPath,
  previewNumber,
  previewOfferLines,
  previewString
} from '~/types/agents'
import { pendingActionFetchErrors } from '~/composables/useAgentPendingAction'

const props = defineProps<{
  action: AgentPendingAction
  compact?: boolean
  canAct?: boolean
}>()

const emit = defineEmits<{
  approved: [action: AgentPendingAction]
  rejected: [action: AgentPendingAction]
}>()

const { t } = useI18n()
const { formatRelativeActivity, formatContactName } = useContactFormatters()
const { formatDate, formatDateTime } = useOrgDateFormat()
const { approve: postApprove, reject: postReject, show } = useAgentPendingAction()
const { refresh: refreshBadge } = useAgentPendingBadge()

const acting = ref(false)
const rejectReason = ref('')
const failureReason = ref<string | null>(props.action.failure_reason)
const localAction = ref(props.action)
const excerptOpen = ref(false)
const excerptPending = ref(false)
const excerptMessages = ref<Array<AgentConversationMessage>>([])

watch(() => props.action, (next) => {
  localAction.value = next
  failureReason.value = next.failure_reason
})

const showActions = computed(() => props.canAct !== false && localAction.value.status === 'pending')
const expiringSoon = computed(() => minutesUntil(localAction.value.expires_at) < 30)
const resultPath = computed(() => pendingResultPath(localAction.value))
const offerLines = computed(() => previewOfferLines(localAction.value.preview))
const availableUnits = computed(() => previewNumber(localAction.value.preview, 'available_units'))
const siteName = computed(() => previewString(localAction.value.preview, 'site_name'))
const classLabel = computed(() => previewString(localAction.value.preview, 'unit_class_label'))
const expiresOn = computed(() => previewString(localAction.value.preview, 'expires_on'))
const channel = computed(() => localAction.value.conversation?.channel ?? null)
const contact = computed(() => localAction.value.conversation?.contact ?? null)

const agentName = computed(() => {
  return localAction.value.agent?.name
    ?? localAction.value.conversation?.agent_key
    ?? t('pages.agentApprovals.unknownAgent')
})

const contactName = computed(() => {
  if (!contact.value) {
    return null
  }
  return formatContactName({
    first_name: contact.value.first_name,
    last_name: contact.value.last_name ?? ''
  })
})

const intent = computed(() => {
  if (localAction.value.tool_key === 'sales.create_reservation') {
    return t('pages.agentApprovals.intentReservation', {
      size: classLabel.value ?? t('common.emptyValue'),
      site: siteName.value ?? t('common.emptyValue'),
      contact: contactName.value ?? t('common.emptyValue'),
      expires: expiresOn.value ? formatDate(expiresOn.value) : t('common.emptyValue')
    })
  }
  if (localAction.value.tool_key === 'sales.create_offer') {
    return t('pages.agentApprovals.intentOffer', {
      contact: contactName.value ?? t('common.emptyValue')
    })
  }
  const path = `ai.tools.${localAction.value.tool_key}`
  const label = t(path)
  return label === path ? localAction.value.tool_key : label
})

function channelLabel(value: string | null): string {
  if (!value) {
    return t('common.emptyValue')
  }
  const path = `demo.chat.channels.${value}`
  const label = t(path)
  return label === path ? value : label
}

async function onApprove() {
  acting.value = true
  try {
    const next = await postApprove(localAction.value.id)
    localAction.value = next
    failureReason.value = next.failure_reason
    void refreshBadge()
    emit('approved', next)
  } catch (err: unknown) {
    const parsed = pendingActionFetchErrors(err)
    if (parsed.expiredReason) {
      localAction.value = { ...localAction.value, status: 'expired' }
      emit('approved', localAction.value)
      void refreshBadge()
      return
    }
    if (parsed.failureReason) {
      failureReason.value = parsed.failureReason
      localAction.value = { ...localAction.value, failure_reason: parsed.failureReason, status: 'pending' }
      return
    }
    throw err
  } finally {
    acting.value = false
  }
}

async function onReject() {
  acting.value = true
  try {
    const next = await postReject(localAction.value.id, rejectReason.value.trim() || undefined)
    localAction.value = next
    void refreshBadge()
    emit('rejected', next)
  } finally {
    acting.value = false
  }
}

async function openExcerpt() {
  excerptOpen.value = true
  excerptPending.value = true
  try {
    const detail = await show(localAction.value.id)
    excerptMessages.value = detail.conversation?.messages ?? []
  } finally {
    excerptPending.value = false
  }
}
</script>

<template>
  <UCard :class="expiringSoon && localAction.status === 'pending' ? 'ring-1 ring-warning' : ''">
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-medium text-highlighted">
            {{ agentName }}
            <span class="font-normal text-dimmed">
              · {{ channelLabel(channel) }}
            </span>
          </p>
          <p class="mt-1 text-sm text-toned">
            {{ intent }}
          </p>
        </div>
        <div class="text-right text-xs text-dimmed">
          <p v-if="localAction.created_at">
            {{ formatRelativeActivity(localAction.created_at) }}
          </p>
          <p :class="expiringSoon && localAction.status === 'pending' ? 'text-warning' : ''">
            {{ t('pages.agentApprovals.expires', { when: formatDateTime(localAction.expires_at) }) }}
          </p>
        </div>
      </div>

      <ul
        v-if="offerLines.length > 0"
        class="space-y-1 rounded-md bg-elevated/50 px-3 py-2 text-sm text-toned"
      >
        <li
          v-for="(line, index) in offerLines"
          :key="index"
        >
          <span
            v-if="line.label"
            class="text-dimmed"
          >{{ line.label }} · </span>{{ line.display }}
        </li>
      </ul>

      <p
        v-if="availableUnits != null"
        class="text-sm text-toned"
      >
        {{ t('pages.agentApprovals.availableUnits', { count: availableUnits }) }}
      </p>

      <p
        v-if="failureReason && localAction.status === 'pending'"
        class="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
      >
        {{ failureReason }}
      </p>

      <p
        v-if="localAction.status === 'approved' && resultPath"
        class="text-sm text-toned"
      >
        {{ t('pages.agentApprovals.created') }}
        <NuxtLink
          :to="resultPath"
          class="font-medium text-highlighted underline"
        >
          {{ t('common.view') }}
        </NuxtLink>
      </p>

      <div
        v-if="showActions"
        class="flex flex-col gap-2"
      >
        <UTextarea
          v-model="rejectReason"
          :placeholder="t('pages.agentApprovals.rejectPlaceholder')"
          :rows="2"
          autoresize
          class="w-full"
        />
        <div class="flex flex-wrap gap-2">
          <UButton
            size="sm"
            icon="i-lucide-check"
            :loading="acting"
            @click="onApprove"
          >
            {{ t('pages.agentApprovals.approve') }}
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            icon="i-lucide-x"
            :loading="acting"
            @click="onReject"
          >
            {{ t('pages.agentApprovals.reject') }}
          </UButton>
          <UButton
            v-if="failureReason"
            size="sm"
            color="warning"
            variant="soft"
            :loading="acting"
            @click="onApprove"
          >
            {{ t('common.retry') }}
          </UButton>
          <UButton
            v-if="!compact"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openExcerpt"
          >
            {{ t('pages.agentApprovals.viewTrace') }}
          </UButton>
        </div>
      </div>

      <p
        v-else-if="localAction.status === 'pending' && !showActions"
        class="text-xs text-dimmed"
      >
        {{ t('demo.chat.colleagueWouldConfirm') }}
      </p>
    </div>
  </UCard>

  <USlideover
    v-model:open="excerptOpen"
    :title="t('pages.agentApprovals.traceTitle')"
    side="right"
  >
    <template #body>
      <div class="space-y-3 p-4 text-sm">
        <p
          v-if="excerptPending"
          class="text-dimmed"
        >
          {{ t('common.loading') }}
        </p>
        <p
          v-else-if="excerptMessages.length === 0"
          class="text-dimmed"
        >
          {{ t('pages.agentApprovals.traceEmpty') }}
        </p>
        <div
          v-for="message in excerptMessages"
          :key="message.id"
          class="rounded-md border border-default px-3 py-2"
        >
          <p class="text-xs uppercase tracking-wide text-dimmed">
            {{ message.role }}
          </p>
          <p class="mt-1 whitespace-pre-wrap text-toned">
            {{ message.content }}
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
