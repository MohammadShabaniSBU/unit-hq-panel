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

function iconFor(action: string): string {
  switch (action) {
    case 'assess_late_fee': return 'i-lucide-badge-dollar-sign'
    case 'place_overlock': return 'i-lucide-lock'
    case 'release_overlock': return 'i-lucide-lock-open'
    case 'record_notice': return 'i-lucide-mail'
    case 'create_task': return 'i-lucide-clipboard-list'
    case 'pause': return 'i-lucide-pause'
    case 'resume': return 'i-lucide-play'
    case 'write_off': return 'i-lucide-eraser'
    case 'cure': return 'i-lucide-check-circle'
    default: return 'i-lucide-circle'
  }
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
      :key="step.id"
      class="print:break-inside-avoid print:shadow-none print:border"
    >
      <div class="flex items-start gap-3">
        <UIcon
          :name="iconFor(String(step.action))"
          class="mt-0.5 size-4 shrink-0 text-dimmed"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium text-highlighted">
                {{ actionLabel(String(step.action)) }}
              </p>
              <p class="text-xs text-muted">
                {{ triggerLabel(String(step.trigger)) }}
                · {{ actorLabel(step) }}
              </p>
            </div>
            <span class="shrink-0 text-xs text-dimmed tabular-nums">
              {{ step.executed_on }}
            </span>
          </div>
          <p
            v-if="artefactSummary(step)"
            class="mt-2 text-sm"
          >
            {{ artefactSummary(step) }}
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
