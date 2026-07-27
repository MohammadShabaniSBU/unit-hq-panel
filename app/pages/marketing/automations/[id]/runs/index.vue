<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { NODE_TYPE_DEFINITIONS, type AutomationRun, type AutomationRunStatus, type AutomationNodeType } from '~/types/automation'

const route = useRoute()
const { t } = useI18n()
const automationId = computed(() => String(route.params.id))

const { automation, pending: automationPending, error: automationError } = useAutomationGet(automationId.value)
const {
  runs,
  pending,
  error,
  refresh,
  page,
  totalCount,
  canGoPrev,
  canGoNext,
  statusFilter,
  fromDate,
  toDate
} = useAutomationRunsList(automationId)

const UBadge = resolveComponent('UBadge')

const fromDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)
const toDateInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)

function parseIsoDate(value: string): CalendarDate | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new CalendarDate(Number(y), Number(m), Number(d))
}

function formatIsoDate(value: CalendarDate | null): string {
  if (!value) return ''
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const fromDateValue = computed({
  get: () => parseIsoDate(fromDate.value),
  set: (value: CalendarDate | null) => {
    fromDate.value = formatIsoDate(value)
  }
})

const toDateValue = computed({
  get: () => parseIsoDate(toDate.value),
  set: (value: CalendarDate | null) => {
    toDate.value = formatIsoDate(value)
  }
})

const statusItems = computed(() => [
  { label: t('automations.runs.filterAllStatuses'), value: 'all' },
  { label: t('automations.runs.status.pending'), value: 'pending' },
  { label: t('automations.runs.status.running'), value: 'running' },
  { label: t('automations.runs.status.succeeded'), value: 'succeeded' },
  { label: t('automations.runs.status.failed'), value: 'failed' },
  { label: t('automations.runs.status.cancelled'), value: 'cancelled' }
])

function statusColor(status: AutomationRunStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  switch (status) {
    case 'succeeded':
      return 'success'
    case 'failed':
      return 'error'
    case 'running':
      return 'info'
    case 'cancelled':
      return 'warning'
    default:
      return 'neutral'
  }
}

function triggerLabel(run: AutomationRun): string {
  if (!run.triggerNode) return t('automations.runs.unknownTrigger')
  const type = run.triggerNode.type as AutomationNodeType
  return NODE_TYPE_DEFINITIONS[type]?.label ?? run.triggerNode.label ?? run.triggerNode.type
}

function formatDateTime(value: string | null): string {
  if (!value) return t('common.emptyValue')
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(run: AutomationRun): string {
  if (!run.startedAt || !run.completedAt) return t('automations.runs.durationRunning')
  const ms = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
  if (ms < 1000) return t('automations.runs.durationMs', { ms })
  return t('automations.runs.durationSeconds', { seconds: (ms / 1000).toFixed(1) })
}

function subjectHref(run: AutomationRun): string | null {
  const hint = run.subject?.hrefHint
  const id = run.subject?.id
  if (!hint || id == null) return null
  if (hint === 'contact') return `/leasing/contacts/${id}`
  if (hint === 'deal') return `/leasing/deals/${id}`
  return null
}

function subjectLabel(run: AutomationRun): string {
  if (run.subject?.name) return run.subject.name
  if (run.subjectId != null) return `#${run.subjectId}`
  return t('common.emptyValue')
}

function causerLabel(run: AutomationRun): string {
  return run.causer?.name ?? t('automations.runs.systemCauser')
}

const columns = computed<Array<TableColumn<AutomationRun>>>(() => [
  {
    id: 'run',
    header: t('automations.runs.columns.run'),
    cell: ({ row }) => h('div', [
      h('span', { class: 'font-medium text-highlighted tabular-nums' }, `#${row.original.id}`),
      h('p', { class: 'mt-0.5 text-xs text-dimmed' }, formatDateTime(row.original.startedAt ?? row.original.createdAt))
    ])
  },
  {
    id: 'status',
    header: t('automations.runs.columns.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`automations.runs.status.${row.original.status}`),
      color: statusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'trigger',
    header: t('automations.runs.columns.trigger'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, triggerLabel(row.original))
  },
  {
    id: 'subject',
    header: t('automations.runs.columns.subject'),
    cell: ({ row }) => {
      const href = subjectHref(row.original)
      const label = subjectLabel(row.original)
      if (!href) return h('span', { class: 'text-sm text-dimmed' }, label)
      return h('a', {
        class: 'text-sm text-highlighted hover:text-primary',
        href,
        onClick: (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          navigateTo(href)
        }
      }, label)
    }
  },
  {
    id: 'duration',
    header: t('automations.runs.columns.duration'),
    cell: ({ row }) => h('span', { class: 'text-sm text-dimmed tabular-nums' }, formatDuration(row.original))
  },
  {
    id: 'causedBy',
    header: t('automations.runs.columns.causedBy'),
    cell: ({ row }) => h('span', { class: 'text-sm' }, causerLabel(row.original))
  }
])

function openRun(run: AutomationRun) {
  navigateTo(`/marketing/automations/${automationId.value}/runs/${run.id}`)
}

function goBack() {
  navigateTo('/marketing/automations')
}
</script>

<template>
  <UContainer class="py-6">
    <div
      v-if="automationPending"
      class="flex h-48 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="automationError || !automation"
      class="flex h-48 flex-col items-center justify-center gap-3"
    >
      <UIcon
        name="i-lucide-alert-circle"
        class="size-8 text-error"
      />
      <p class="text-sm text-dimmed">
        {{ $t('automations.editor.loadError') }}
      </p>
      <UButton
        :label="$t('automations.editor.back')"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
        @click="goBack"
      />
    </div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          size="sm"
          @click="goBack"
        />
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-semibold text-highlighted">
            {{ automation.name }}
          </h1>
          <p class="text-sm text-dimmed">
            {{ $t('automations.runs.title') }}
          </p>
        </div>
        <AutomationSubnav
          :automation-id="automationId"
          active="runs"
        />
      </div>

      <div class="mb-4 flex flex-wrap items-end gap-3">
        <UFormField :label="$t('automations.runs.filterStatus')">
          <USelect
            v-model="statusFilter"
            :items="statusItems"
            value-key="value"
            label-key="label"
            class="w-44"
          />
        </UFormField>
        <UFormField :label="$t('automations.runs.filterFrom')">
          <UInputDate
            ref="fromDateInput"
            v-model="fromDateValue"
            class="w-44"
          >
            <template #trailing>
              <UPopover :reference="fromDateInput?.inputsRef?.[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('automations.runs.filterFrom')"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="fromDateValue"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>
        <UFormField :label="$t('automations.runs.filterTo')">
          <UInputDate
            ref="toDateInput"
            v-model="toDateValue"
            class="w-44"
          >
            <template #trailing>
              <UPopover :reference="toDateInput?.inputsRef?.[3]?.$el">
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  icon="i-lucide-calendar"
                  :aria-label="$t('automations.runs.filterTo')"
                  class="px-0"
                />
                <template #content>
                  <UCalendar
                    v-model="toDateValue"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>
        </UFormField>
      </div>

      <div
        v-if="pending"
        class="flex h-48 items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="error"
        class="flex h-48 flex-col items-center justify-center gap-3"
      >
        <UIcon
          name="i-lucide-alert-circle"
          class="size-8 text-error"
        />
        <p class="text-sm text-dimmed">
          {{ $t('automations.runs.loadError') }}
        </p>
        <UButton
          :label="$t('common.retry')"
          variant="outline"
          color="neutral"
          @click="() => refresh()"
        />
      </div>

      <div
        v-else-if="runs.length === 0"
        class="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-default"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ $t('automations.runs.emptyTitle') }}
        </p>
        <p class="text-xs text-dimmed">
          {{ $t('automations.runs.emptySubtitle') }}
        </p>
      </div>

      <template v-else>
        <div class="overflow-hidden rounded-xl border border-default">
          <UTable
            :data="runs"
            :columns="columns"
            class="cursor-pointer"
            @select="(_e, row) => openRun(row.original)"
          />
        </div>

        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-dimmed">
            {{ $t('common.showing', { count: runs.length, total: totalCount }) }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="!canGoPrev"
              :aria-label="$t('common.previousPage')"
              @click="page--"
            />
            <span class="text-sm text-dimmed">
              {{ $t('common.pageNumber', { page }) }}
            </span>
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="!canGoNext"
              :aria-label="$t('common.nextPage')"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </template>
  </UContainer>
</template>
