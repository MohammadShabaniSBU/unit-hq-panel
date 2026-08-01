<script setup lang="ts">
import type { ApiDelinquencyNextStep, ApiDelinquencyPolicyStep } from '~/types/delinquency'

const props = defineProps<{
  steps: Array<ApiDelinquencyPolicyStep>
  executedIds: Array<number>
  nextStep?: ApiDelinquencyNextStep | null
  compact?: boolean
}>()

const { t } = useI18n()

const ordered = computed(() =>
  [...props.steps].sort((a, b) => (a.sort - b.sort) || ((a.id ?? 0) - (b.id ?? 0)))
)

function isExecuted(step: ApiDelinquencyPolicyStep): boolean {
  return step.id != null && props.executedIds.includes(step.id)
}

function isNext(step: ApiDelinquencyPolicyStep): boolean {
  return props.nextStep != null && step.id === props.nextStep.policy_step_id
}

function actionLabel(action: string): string {
  const key = `billing.delinquency.actions.${action}`
  return t(key) !== key ? t(key) : action
}

function nextHint(): string | null {
  if (!props.nextStep) return null
  if (props.nextStep.days_until === 0) {
    return t('billing.delinquency.nextStepDue', { action: actionLabel(props.nextStep.action) })
  }
  return t('billing.delinquency.nextStepIn', {
    action: actionLabel(props.nextStep.action),
    days: props.nextStep.days_until
  })
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-1.5">
      <UTooltip
        v-for="step in ordered"
        :key="step.id ?? `${step.offset_days}-${step.action}`"
        :text="`${actionLabel(step.action)} · ${t('billing.delinquency.dayOffset', { days: step.offset_days })}`"
      >
        <span
          class="inline-flex size-2.5 rounded-full border"
          :class="{
            'border-primary bg-primary': isExecuted(step),
            'border-warning bg-warning/30 ring-2 ring-warning/40': !isExecuted(step) && isNext(step),
            'border-muted bg-transparent': !isExecuted(step) && !isNext(step)
          }"
        />
      </UTooltip>
    </div>
    <p
      v-if="!compact && nextHint()"
      class="text-xs text-muted"
    >
      {{ nextHint() }}
    </p>
  </div>
</template>
