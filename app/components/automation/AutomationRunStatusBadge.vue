<script setup lang="ts">
import type { AutomationCancelCause, AutomationRunStatus } from '~/types/automation'

const props = defineProps<{
  status: AutomationRunStatus
  cancelCause?: AutomationCancelCause | null
  waitingUntil?: string | null
  showResumeHint?: boolean
}>()

const { statusColor, cancelCauseIcon, resumesIn } = useAutomationRunPresentation()

const resumeHint = computed(() => {
  if (!props.showResumeHint || props.status !== 'waiting') return null
  return resumesIn(props.waitingUntil)
})

const causeIcon = computed(() => {
  if (props.status !== 'cancelled' || !props.cancelCause) return null
  return cancelCauseIcon(props.cancelCause)
})
</script>

<template>
  <div class="inline-flex flex-col items-start gap-0.5">
    <div class="inline-flex items-center gap-1">
      <UBadge
        :label="$t(`automations.runs.status.${status}`)"
        :color="statusColor(status)"
        variant="subtle"
        size="sm"
      />
      <UIcon
        v-if="causeIcon"
        :name="causeIcon"
        class="size-3.5 text-dimmed"
        :title="$t(`automations.runs.lifecycle.cancelCause.${cancelCause}`)"
      />
    </div>
    <span
      v-if="resumeHint"
      class="text-[11px] text-warning tabular-nums"
    >
      {{ resumeHint }}
    </span>
  </div>
</template>
