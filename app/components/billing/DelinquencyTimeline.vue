<script setup lang="ts">
import type { ApiDelinquencyTimelineStep } from '~/types/delinquency'
import { formatMoney } from '~/composables/useMoney'

const props = defineProps<{
  steps: Array<ApiDelinquencyTimelineStep>
  currency?: string | null
}>()

const emit = defineEmits<{
  markSent: [noticeId: number]
}>()

const { t, locale } = useI18n()
const { formatDate, formatDateTime } = useOrgDateFormat()

function isCall(step: ApiDelinquencyTimelineStep): boolean {
  return step.entry_type === 'call'
}

function actionLabel(action: string): string {
  const key = `billing.delinquency.actions.${action}`
  return t(key) !== key ? t(key) : action
}

function triggerLabel(trigger: string): string {
  const key = `billing.delinquency.triggers.${trigger}`
  return t(key) !== key ? t(key) : trigger
}

function actorLabel(step: ApiDelinquencyTimelineStep): string {
  if (step.created_by?.name) return step.created_by.name
  if (step.trigger === 'ladder' || step.trigger === 'cure' || step.trigger === 'playbook') {
    return t('billing.delinquency.actorEngine')
  }
  return t('common.emptyValue')
}

function artefactSummary(step: ApiDelinquencyTimelineStep): string | null {
  if (step.charge) {
    return formatMoney(step.charge.amount, step.charge.currency || props.currency, locale.value)
      + (step.charge.description ? ` · ${step.charge.description}` : '')
  }
  if (step.contract_notice) {
    const typeKey = `billing.delinquency.noticeTypes.${step.contract_notice.notice_type}`
    const type = t(typeKey) !== typeKey ? t(typeKey) : step.contract_notice.notice_type
    if (step.contract_notice.sent_at) {
      return t('billing.delinquency.noticeSentSummary', {
        type,
        channel: step.contract_notice.sent_channel ?? ''
      })
    }
    return t('billing.delinquency.noticeUnsentSummary', { type })
  }
  if (step.unit_hold) {
    return t('billing.delinquency.holdSummary', { unitId: step.unit_hold.unit_id })
  }
  if (step.task) {
    return step.task.title
  }
  if (step.detail?.reason) {
    return String(step.detail.reason)
  }
  return null
}

function iconFor(step: ApiDelinquencyTimelineStep): string {
  if (isCall(step)) {
    return step.direction === 'outbound' ? 'i-lucide-phone-outgoing' : 'i-lucide-phone-incoming'
  }
  switch (step.action) {
    case 'assess_late_fee': return 'i-lucide-badge-dollar-sign'
    case 'place_overlock': return 'i-lucide-lock'
    case 'release_overlock': return 'i-lucide-lock-open'
    case 'revoke_access': return 'i-lucide-ban'
    case 'restore_access': return 'i-lucide-key-round'
    case 'record_notice': return 'i-lucide-mail'
    case 'create_task': return 'i-lucide-clipboard-list'
    case 'pause': return 'i-lucide-pause'
    case 'resume': return 'i-lucide-play'
    case 'write_off': return 'i-lucide-eraser'
    case 'cure': return 'i-lucide-check-circle'
    default: return 'i-lucide-circle'
  }
}

function callTitle(step: ApiDelinquencyTimelineStep): string {
  if (step.direction === 'outbound') {
    return t('inbox.call.outbound')
  }
  return t('inbox.call.inbound')
}

function callSummary(step: ApiDelinquencyTimelineStep): string | null {
  const parts: Array<string> = []
  if (step.outcome) {
    parts.push(step.outcome)
  }
  if (step.duration && step.duration > 0) {
    parts.push(t('inbox.call.durationSeconds', { count: step.duration }))
  }
  return parts.length ? parts.join(' · ') : (step.body_text ?? null)
}

function dispositionLabel(key: string): string {
  const i18nKey = `calls.dispositions.${key}`
  const translated = t(i18nKey)
  return translated !== i18nKey ? translated : key
}
</script>

<template>
  <div class="delinquency-timeline flex flex-col gap-3">
    <div
      v-if="!steps.length"
      class="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-default bg-elevated/30"
    >
      <p class="text-sm text-dimmed">
        {{ t('billing.delinquency.timelineEmpty') }}
      </p>
    </div>

    <UCard
      v-for="step in steps"
      :key="String(step.id)"
      class="print:break-inside-avoid print:shadow-none print:border"
    >
      <div class="flex items-start gap-3">
        <UIcon
          :name="iconFor(step)"
          class="mt-0.5 size-4 shrink-0 text-dimmed"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5">
                <p class="font-medium text-highlighted">
                  {{ isCall(step) ? callTitle(step) : actionLabel(String(step.action)) }}
                </p>
                <UBadge
                  v-if="isCall(step) && step.disposition"
                  :label="dispositionLabel(step.disposition)"
                  :color="step.disposition === 'payment_promised' ? 'success' : 'neutral'"
                  variant="subtle"
                  size="xs"
                />
              </div>
              <p class="text-xs text-muted">
                <template v-if="isCall(step)">
                  {{ t('calls.call') }}
                </template>
                <template v-else>
                  {{ triggerLabel(String(step.trigger)) }}
                  · {{ actorLabel(step) }}
                </template>
              </p>
            </div>
            <span class="shrink-0 text-xs text-dimmed tabular-nums">
              {{ step.executed_on ? formatDate(step.executed_on) : formatDateTime(step.created_at, { empty: t('common.emptyValue') }) }}
            </span>
          </div>
          <p
            v-if="isCall(step) ? callSummary(step) : artefactSummary(step)"
            class="mt-2 text-sm"
          >
            {{ isCall(step) ? callSummary(step) : artefactSummary(step) }}
          </p>
          <div
            v-if="step.contract_notice && !step.contract_notice.sent_at"
            class="mt-2 print:hidden"
          >
            <UButton
              size="xs"
              variant="soft"
              :label="t('billing.delinquency.markSent')"
              @click="emit('markSent', step.contract_notice.id)"
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
@media print {
  .delinquency-timeline :deep(.delinquency-actions),
  .delinquency-timeline :deep(button) {
    display: none !important;
  }
}
</style>
