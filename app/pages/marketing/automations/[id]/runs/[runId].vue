<script setup lang="ts">
import {
  NODE_TYPE_DEFINITIONS,
  type AutomationNodeType,
  type AutomationRun,
  type AutomationRunStatus,
  type AutomationRunStep,
  type AutomationRunStepStatus
} from '~/types/automation'

const route = useRoute()
const { t } = useI18n()

const automationId = computed(() => String(route.params.id))
const runId = computed(() => String(route.params.runId))

const { automation, pending: automationPending } = useAutomationGet(automationId.value)
const { run, pending, error, refresh } = useAutomationRunGet(automationId, runId)

const openPanels = ref<Record<string, boolean>>({})

function statusColor(status: AutomationRunStatus | AutomationRunStepStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'succeeded':
      return 'success'
    case 'failed':
      return 'error'
    case 'running':
      return 'info'
    case 'cancelled':
      return 'warning'
    case 'skipped':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function nodeLabel(type: string): string {
  const def = NODE_TYPE_DEFINITIONS[type as AutomationNodeType]
  return def?.label ?? type
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
  return nodeLabel(runValue.triggerNode.type) || runValue.triggerNode.label
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

function stepMuted(step: AutomationRunStep): boolean {
  return step.status === 'skipped'
}

function goBackToRuns() {
  navigateTo(`/marketing/automations/${automationId.value}/runs`)
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
      v-else-if="error || !run"
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
            <span class="ms-2 font-normal text-dimmed tabular-nums">#{{ run.id }}</span>
          </h1>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <UBadge
              :label="$t(`automations.runs.status.${run.status}`)"
              :color="statusColor(run.status)"
              variant="subtle"
              size="sm"
            />
            <NuxtLink
              v-if="run.rootRunId"
              :to="`/marketing/automations/${automationId}/runs/${run.rootRunId}`"
              class="text-xs text-primary hover:underline"
            >
              {{ $t('automations.runs.partOfRun', { id: run.rootRunId }) }}
            </NuxtLink>
          </div>
        </div>
        <AutomationSubnav
          :automation-id="automationId"
          active="runs"
        />
      </div>

      <div class="mb-6 grid gap-4 rounded-xl border border-default p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.startedAt') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ formatDateTime(run.startedAt ?? run.createdAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.completedAt') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ formatDateTime(run.completedAt) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.trigger') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ triggerLabel(run) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.causedBy') }}
          </p>
          <p class="mt-0.5 text-sm text-highlighted">
            {{ causerLabel(run) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-dimmed">
            {{ $t('automations.runs.columns.subject') }}
          </p>
          <NuxtLink
            v-if="subjectHref(run)"
            :to="subjectHref(run)!"
            class="mt-0.5 block text-sm text-primary hover:underline"
          >
            {{ subjectLabel(run) }}
          </NuxtLink>
          <p
            v-else
            class="mt-0.5 text-sm text-highlighted"
          >
            {{ subjectLabel(run) }}
          </p>
        </div>
      </div>

      <div
        v-if="run.error"
        class="mb-6 rounded-xl border border-error/30 bg-error/5 p-4"
      >
        <p class="text-xs font-medium text-error">
          {{ $t('automations.runs.error') }}
        </p>
        <pre class="mt-2 overflow-x-auto whitespace-pre-wrap text-sm text-error">{{ run.error }}</pre>
      </div>

      <h2 class="mb-3 text-sm font-semibold text-highlighted">
        {{ $t('automations.runs.steps') }}
      </h2>

      <div
        v-if="run.steps.length === 0"
        class="rounded-xl border border-dashed border-default p-6 text-center text-sm text-dimmed"
      >
        {{ $t('automations.runs.noSteps') }}
      </div>

      <ol
        v-else
        class="space-y-3"
      >
        <li
          v-for="step in run.steps"
          :key="step.id"
          class="rounded-xl border border-default p-4"
          :class="stepMuted(step) ? 'opacity-60' : ''"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p
                class="text-sm font-medium"
                :class="stepMuted(step) ? 'text-dimmed' : 'text-highlighted'"
              >
                {{ nodeLabel(step.nodeType) }}
              </p>
              <p class="mt-0.5 text-xs text-dimmed tabular-nums">
                {{ formatDurationMs(step.durationMs) }}
              </p>
            </div>
            <UBadge
              :label="$t(`automations.runs.status.${step.status}`)"
              :color="statusColor(step.status)"
              variant="subtle"
              size="sm"
            />
          </div>

          <p
            v-if="step.error"
            class="mt-2 text-sm text-error"
          >
            {{ step.error }}
          </p>

          <div class="mt-3 space-y-2">
            <div>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-medium text-dimmed hover:text-highlighted"
                @click="togglePanel(`${step.id}-input`)"
              >
                <UIcon
                  :name="isPanelOpen(`${step.id}-input`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="size-3.5"
                />
                {{ $t('automations.runs.stepInput') }}
              </button>
              <pre
                v-if="isPanelOpen(`${step.id}-input`)"
                class="mt-2 max-h-64 overflow-auto rounded-lg bg-elevated p-3 text-xs text-highlighted"
              >{{ prettyJson(step.input) }}</pre>
            </div>
            <div>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-medium text-dimmed hover:text-highlighted"
                @click="togglePanel(`${step.id}-output`)"
              >
                <UIcon
                  :name="isPanelOpen(`${step.id}-output`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="size-3.5"
                />
                {{ $t('automations.runs.stepOutput') }}
              </button>
              <pre
                v-if="isPanelOpen(`${step.id}-output`)"
                class="mt-2 max-h-64 overflow-auto rounded-lg bg-elevated p-3 text-xs text-highlighted"
              >{{ prettyJson(step.output) }}</pre>
            </div>
          </div>
        </li>
      </ol>

    </template>
  </UContainer>
</template>
