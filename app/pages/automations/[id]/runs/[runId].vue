<script setup lang="ts">
import {
  NODE_TYPE_DEFINITIONS,
  type AutomationCancelCause,
  type AutomationNode,
  type AutomationNodeType,
  type AutomationRun,
  type AutomationRunStep,
  type AutomationRunStepStatus
} from '~/types/automation'
import { Permission } from '~/types/permissions'

const route = useRoute()
const { t } = useI18n()

const automationId = computed(() => String(route.params.id))
const runId = computed(() => String(route.params.runId))

const { automation, pending: automationPending } = useAutomationGet(automationId.value)
const { run, pending, error, refresh } = useAutomationRunGet(automationId, runId)
const { cancelRun, cancelling } = useAutomationRunCancel()
const { can } = usePermissions()
const canManageAutomations = computed(() => can(Permission.AutomationManage))
const {
  statusColor,
  cancelCauseIcon,
  resumesIn,
  waitedDuration,
  isCancellable,
  isTerminal
} = useAutomationRunPresentation()

const openPanels = ref<Record<string, boolean>>({})
const guardOpen = ref(false)
const cancelOpen = ref(false)
const cancelReason = ref('')
const localRun = ref<AutomationRun | null>(null)

watch(run, (value) => {
  localRun.value = value
}, { immediate: true })

const displayRun = computed(() => localRun.value)

interface DisplayStep {
  key: string
  kind: 'step' | 'untouched'
  step?: AutomationRunStep
  node?: AutomationNode
}

const displaySteps = computed<Array<DisplayStep>>(() => {
  const current = displayRun.value
  if (!current) return []

  const items: Array<DisplayStep> = current.steps.map(step => ({
    key: `step-${step.id}`,
    kind: 'step' as const,
    step
  }))

  if (current.status !== 'cancelled' || !automation.value) {
    return items
  }

  const steppedNodeIds = new Set(
    current.steps
      .map(s => s.nodeId)
      .filter((id): id is string => id != null)
  )

  for (const node of automation.value.nodes) {
    if (node.dbId == null) continue
    if (steppedNodeIds.has(String(node.dbId))) continue
    items.push({
      key: `untouched-${node.dbId}`,
      kind: 'untouched',
      node
    })
  }

  return items
})

function nodeLabel(type: string, fallback?: string): string {
  const def = NODE_TYPE_DEFINITIONS[type as AutomationNodeType]
  return def?.label ?? fallback ?? type
}

function formatDateTime(value: string | null): string {
  if (!value) return t('common.emptyValue')
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatDurationMs(ms: number | null): string {
  if (ms == null) return t('common.emptyValue')
  if (ms < 1000) return t('automations.runs.durationMs', { ms })
  return t('automations.runs.durationSeconds', { seconds: (ms / 1000).toFixed(1) })
}

function subjectHref(runValue: AutomationRun): string | null {
  const hint = runValue.subject?.hrefHint
  const id = runValue.subject?.id
  if (!hint || id == null) return null
  if (hint === 'contact') return `/leasing/contacts/${id}`
  if (hint === 'deal') return `/leasing/deals/${id}`
  return null
}

function subjectLabel(runValue: AutomationRun): string {
  if (runValue.subject?.name) return runValue.subject.name
  if (runValue.subjectId != null) return `#${runValue.subjectId}`
  return t('common.emptyValue')
}

function causerLabel(runValue: AutomationRun): string {
  return runValue.causer?.name ?? t('automations.runs.systemCauser')
}

function triggerLabel(runValue: AutomationRun): string {
  if (!runValue.triggerNode) return t('automations.runs.unknownTrigger')
  return nodeLabel(runValue.triggerNode.type, runValue.triggerNode.label)
}

function prettyJson(value: Record<string, unknown> | null): string {
  if (value == null) return 'null'
  return JSON.stringify(value, null, 2)
}

function togglePanel(key: string) {
  openPanels.value[key] = !openPanels.value[key]
}

function isPanelOpen(key: string): boolean {
  return !!openPanels.value[key]
}

function isCancelStep(step: AutomationRunStep): boolean {
  return step.nodeType === 'run.cancelled'
}

function isWaitStep(step: AutomationRunStep): boolean {
  return step.nodeType === 'logic.wait'
}

function waitSubtitle(step: AutomationRunStep): string | null {
  if (!isWaitStep(step)) return null
  if (step.status === 'waiting') {
    const resumeAt = typeof step.output?.resume_at === 'string'
      ? step.output.resume_at
      : displayRun.value?.waitingUntil
    return resumesIn(resumeAt)
      ?? (resumeAt
        ? t('automations.runs.lifecycle.waitingUntil', { time: formatDateTime(resumeAt) })
        : null)
  }
  if (step.status === 'succeeded') {
    return waitedDuration(step.startedAt, step.completedAt, step.durationMs)
  }
  return null
}

function cancelStepCause(step: AutomationRunStep): AutomationCancelCause | null {
  const cause = step.output?.cause
  const allowed: Array<AutomationCancelCause> = [
    'manual',
    'guard',
    'superseded',
    'trigger_object_deleted'
  ]
  if (typeof cause === 'string' && (allowed as Array<string>).includes(cause)) {
    return cause as AutomationCancelCause
  }
  return displayRun.value?.cancelCause ?? null
}

function cancelStepCauserName(step: AutomationRunStep): string | null {
  if (displayRun.value?.cancelledBy?.name) {
    return displayRun.value.cancelledBy.name
  }
  if (displayRun.value?.cancelledBy?.id != null) {
    return `#${displayRun.value.cancelledBy.id}`
  }
  const fromOutput = step.output?.cancelled_by
  if (typeof fromOutput === 'number') return `#${fromOutput}`
  return null
}

function stepStatusLabel(status: AutomationRunStepStatus | 'untouched'): string {
  if (status === 'untouched') return t('automations.runs.lifecycle.untouched')
  return t(`automations.runs.status.${status}`)
}

async function confirmCancel() {
  const current = displayRun.value
  if (!current) return
  const updated = await cancelRun(current.id)
  cancelOpen.value = false
  cancelReason.value = ''
  if (updated) {
    localRun.value = updated
  } else {
    await refresh()
  }
}

function goBackToRuns() {
  const from = route.query.from
  if (typeof from === 'string' && from.startsWith('/')) {
    navigateTo(from)
    return
  }
  navigateTo(`/automations/${automationId.value}/runs`)
}
</script>

<template>
  <UContainer class="py-6">
    <div
      v-if="automationPending || pending"
      class="flex h-48 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error || !displayRun"
      class="flex h-48 flex-col items-center justify-center gap-3"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-8 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('automations.runs.detailLoadError') }}
      </p>
      <div class="flex items-center gap-2">
        <UButton
          :label="$t('common.retry')"
          variant="outline"
          color="neutral"
          @click="() => refresh()"
        />
        <UButton
          :label="$t('automations.runs.backToRuns')"
          color="neutral"
          variant="outline"
          icon="i-lucide-arrow-left"
          @click="goBackToRuns"
        />
      </div>
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          size="sm"
          @click="goBackToRuns"
        />
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-semibold text-highlighted">
            {{ automation?.name ?? $t('automations.runs.title') }}
            <span class="ms-2 font-normal text-dimmed tabular-nums">#{{ displayRun.id }}</span>
          </h1>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <AutomationRunStatusBadge
              :status="displayRun.status"
              :cancel-cause="displayRun.cancelCause"
              :waiting-until="displayRun.waitingUntil"
              show-resume-hint
            />
            <UBadge
              v-if="displayRun.guard"
              :label="$t('automations.runs.lifecycle.guarded')"
              color="warning"
              variant="subtle"
              size="sm"
            />
            <NuxtLink
              v-if="displayRun.rootRunId"
              :to="`/automations/${automationId}/runs/${displayRun.rootRunId}`"
              class="text-xs text-primary hover:underline"
            >
              {{ $t('automations.runs.partOfRun', { id: displayRun.rootRunId }) }}
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="canManageAutomations"
          class="flex items-center gap-2"
        >
          <UTooltip
            v-if="isTerminal(displayRun.status)"
            :text="$t('automations.runs.lifecycle.cancelDisabledTooltip')"
          >
            <UButton
              :label="$t('automations.runs.lifecycle.cancel')"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-ban"
              disabled
            />
          </UTooltip>
          <UButton
            v-else-if="isCancellable(displayRun.status)"
            :label="$t('automations.runs.lifecycle.cancel')"
            color="error"
            variant="outline"
            size="sm"
            icon="i-lucide-ban"
            :loading="cancelling"
            @click="cancelOpen = true"
          />
        </div>

        <AutomationSubnav
          :automation-id="automationId"
          active="runs"
        />
      </div>

      <div
        v-if="displayRun.guard"
        class="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-4"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 text-left"
          @click="guardOpen = !guardOpen"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-shield"
              class="size-4 text-warning"
            />
            <span class="text-sm font-medium text-highlighted">
              {{ $t('automations.runs.lifecycle.guard') }}
            </span>
          </div>
          <span class="text-xs text-dimmed">
            {{ guardOpen
              ? $t('automations.runs.lifecycle.hideGuard')
              : $t('automations.runs.lifecycle.showGuard') }}
          </span>
        </button>
        <div
          v-if="guardOpen"
          class="mt-3"
        >
          <AutomationConditionTreeReadonly :group="displayRun.guard" />
        </div>
      </div>

      <div class="mb-6 grid gap-4 rounded-xl border border-default p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.startedAt') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ formatDateTime(displayRun.startedAt ?? displayRun.createdAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.completedAt') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ formatDateTime(displayRun.completedAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.trigger') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ triggerLabel(displayRun) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.causedBy') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ causerLabel(displayRun) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.subject') }}
          </p>
          <NuxtLink
            v-if="subjectHref(displayRun)"
            :to="subjectHref(displayRun)!"
            class="mt-0.5 block text-sm text-primary hover:underline"
          >
            {{ subjectLabel(displayRun) }}
          </NuxtLink>
          <p
            v-else
            class="mt-0.5 text-sm text-highlighted"
          >
            {{ subjectLabel(displayRun) }}
          </p>
        </div>
      </div>

      <div
        v-if="displayRun.error"
        class="mb-6 rounded-xl border border-error/30 bg-error/5 p-4"
      >
        <p class="text-xs font-medium text-error">
          {{ $t('automations.runs.error') }}
        </p>
        <pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-error">{{ displayRun.error }}</pre>
      </div>

      <h2 class="mb-3 text-sm font-semibold text-highlighted">
        {{ $t('automations.runs.steps') }}
      </h2>

      <div
        v-if="displaySteps.length === 0"
        class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-dimmed"
      >
        {{ $t('automations.runs.noSteps') }}
      </div>

      <ol
        v-else
        class="space-y-3"
      >
        <li
          v-for="item in displaySteps"
          :key="item.key"
        >
          <!-- Untouched (cancelled before reach) -->
          <UTooltip
            v-if="item.kind === 'untouched' && item.node"
            :text="$t('automations.runs.lifecycle.untouchedTooltip')"
          >
            <div class="rounded-xl border border-dashed border-default/60 p-4 opacity-40">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-dimmed">
                    {{ item.node.label || nodeLabel(item.node.type) }}
                  </p>
                  <p class="mt-0.5 text-xs text-dimmed">
                    {{ $t('automations.runs.lifecycle.untouched') }}
                  </p>
                </div>
                <UBadge
                  :label="stepStatusLabel('untouched')"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
              </div>
            </div>
          </UTooltip>

          <!-- Cancel synthetic step -->
          <div
            v-else-if="item.step && isCancelStep(item.step)"
            class="rounded-xl border-2 border-neutral-400/50 bg-elevated p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="flex items-start gap-2">
                <UIcon
                  :name="cancelCauseIcon(cancelStepCause(item.step))"
                  class="mt-0.5 size-4 text-dimmed"
                />
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    {{ $t('automations.runs.lifecycle.cancelStep') }}
                  </p>
                  <p
                    v-if="cancelStepCause(item.step)"
                    class="mt-0.5 text-xs text-dimmed"
                  >
                    {{ $t(`automations.runs.lifecycle.cancelCause.${cancelStepCause(item.step)!}`) }}
                  </p>
                  <p
                    v-if="cancelStepCauserName(item.step)"
                    class="mt-0.5 text-xs text-dimmed"
                  >
                    {{ $t('automations.runs.lifecycle.cancelledBy', { name: cancelStepCauserName(item.step) }) }}
                  </p>
                  <p class="mt-0.5 text-xs text-dimmed tabular-nums">
                    {{ $t('automations.runs.lifecycle.cancelledAt', {
                      time: formatDateTime(item.step.completedAt ?? item.step.createdAt)
                    }) }}
                  </p>
                </div>
              </div>
              <UBadge
                :label="$t('automations.runs.status.cancelled')"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </div>
          </div>

          <!-- Normal / wait / skipped steps -->
          <UTooltip
            v-else-if="item.step"
            :text="item.step.status === 'skipped'
              ? $t('automations.runs.lifecycle.skippedTooltip')
              : undefined"
            :disabled="item.step.status !== 'skipped'"
          >
            <div
              class="rounded-xl border border-default p-4"
              :class="item.step.status === 'skipped' ? 'opacity-60' : ''"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="flex items-start gap-2">
                  <UIcon
                    v-if="isWaitStep(item.step) && item.step.status === 'waiting'"
                    name="i-lucide-hourglass"
                    class="mt-0.5 size-4 text-warning"
                  />
                  <div>
                    <p
                      class="text-sm font-medium"
                      :class="item.step.status === 'skipped' ? 'text-dimmed' : 'text-highlighted'"
                    >
                      {{ nodeLabel(item.step.nodeType) }}
                    </p>
                    <p
                      v-if="waitSubtitle(item.step)"
                      class="mt-0.5 text-xs text-warning tabular-nums"
                    >
                      {{ waitSubtitle(item.step) }}
                    </p>
                    <p
                      v-else
                      class="mt-0.5 text-xs text-dimmed tabular-nums"
                    >
                      {{ formatDurationMs(item.step.durationMs) }}
                    </p>
                  </div>
                </div>
                <UBadge
                  :label="stepStatusLabel(item.step.status)"
                  :color="statusColor(item.step.status)"
                  variant="subtle"
                  size="sm"
                />
              </div>

              <p
                v-if="item.step.error"
                class="mt-2 text-sm text-error"
              >
                {{ item.step.error }}
              </p>

              <div class="mt-3 space-y-2">
                <div>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs font-medium text-dimmed hover:text-highlighted"
                    @click="togglePanel(`${item.step.id}-input`)"
                  >
                    <UIcon
                      :name="isPanelOpen(`${item.step.id}-input`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-3.5"
                    />
                    {{ $t('automations.runs.stepInput') }}
                  </button>
                  <pre
                    v-if="isPanelOpen(`${item.step.id}-input`)"
                    class="mt-2 max-h-64 overflow-auto rounded-lg bg-elevated p-3 text-xs text-highlighted"
                  >{{ prettyJson(item.step.input) }}</pre>
                </div>
                <div>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs font-medium text-dimmed hover:text-highlighted"
                    @click="togglePanel(`${item.step.id}-output`)"
                  >
                    <UIcon
                      :name="isPanelOpen(`${item.step.id}-output`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-3.5"
                    />
                    {{ $t('automations.runs.stepOutput') }}
                  </button>
                  <pre
                    v-if="isPanelOpen(`${item.step.id}-output`)"
                    class="mt-2 max-h-64 overflow-auto rounded-lg bg-elevated p-3 text-xs text-highlighted"
                  >{{ prettyJson(item.step.output) }}</pre>
                </div>
              </div>
            </div>
          </UTooltip>
        </li>
      </ol>

      <UModal
        v-model:open="cancelOpen"
        :title="$t('automations.runs.lifecycle.cancelConfirmTitle')"
        :description="$t('automations.runs.lifecycle.cancelConfirmBody')"
      >
        <template #body>
          <UFormField :label="$t('automations.runs.lifecycle.cancelConfirmReason')">
            <UInput
              v-model="cancelReason"
              class="w-full"
            />
          </UFormField>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="$t('automations.cancel')"
              color="neutral"
              variant="outline"
              @click="cancelOpen = false"
            />
            <UButton
              :label="$t('automations.runs.lifecycle.cancelConfirmAction')"
              color="error"
              :loading="cancelling"
              @click="confirmCancel"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
