<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { EnrolmentListStatus, PlaybookEnrolment } from '~/types/playbook'

const props = defineProps<{
  playbookId: number
  playbookKind: 'debt_process' | 'lead_chase'
}>()

const { t } = useI18n()
const { formatDateTime: formatOrgDateTime } = useOrgDateFormat()
const { resumesIn } = useAutomationRunPresentation()
const { cancelRun, cancelling } = useAutomationRunCancel()

const UButton = resolveComponent('UButton')
const NuxtLink = resolveComponent('NuxtLink')
const PlaybooksProgressDots = resolveComponent('PlaybooksProgressDots')

const tab = ref<EnrolmentListStatus>('active')
const confirmExitId = ref<number | null>(null)

const {
  enrolments,
  pending,
  error,
  refresh,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  totalCount
} = usePlaybookEnrolments(() => props.playbookId, tab)

function exitCauseLabel(row: PlaybookEnrolment): string {
  if (row.cancelCause === 'manual') return t('playbooks.enrolments.exit.manual')
  if (row.cancelCause === 'superseded') return t('playbooks.enrolments.exit.superseded')
  if (row.cancelCause === 'trigger_object_deleted') return t('playbooks.enrolments.exit.deleted')

  if (row.cancelCause === 'guard') {
    if (props.playbookKind === 'debt_process') {
      const cure = row.subject.cure_trigger
      if (cure === 'payment') return t('playbooks.enrolments.exit.paid')
      if (cure === 'write_off') return t('playbooks.enrolments.exit.writtenOff')
      if (cure === 'vacated') return t('playbooks.enrolments.exit.vacated')
      return t('playbooks.enrolments.exit.guardDebt')
    }
    const status = row.subject.deal_status
    if (status === 'closed_won') return t('playbooks.enrolments.exit.won')
    if (status === 'closed_lost') return t('playbooks.enrolments.exit.lost')
    return t('playbooks.enrolments.exit.advanced')
  }

  if (row.status === 'succeeded') return t('playbooks.enrolments.exit.completed')
  if (row.status === 'failed') return t('playbooks.enrolments.exit.failed')
  return t('common.emptyValue')
}

function formatDate(value: string | null): string {
  return formatOrgDateTime(value, { empty: t('common.emptyValue') })
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return t('common.emptyValue')
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return t('playbooks.enrolments.durationDays', { days, hours })
  const minutes = Math.floor((seconds % 3600) / 60)
  return t('playbooks.enrolments.durationHours', { hours, minutes })
}

function progressHint(row: PlaybookEnrolment): string | null {
  if (row.status === 'waiting') {
    return resumesIn(row.waitingUntil)
  }
  if (row.nextStepAt) {
    return resumesIn(row.nextStepAt)
  }
  return t('playbooks.enrolments.stepsProgress', {
    done: row.stepsCompleted,
    total: row.stepTotal
  })
}

function openRun(row: PlaybookEnrolment) {
  navigateTo({
    path: `/automations/${row.automationId}/runs/${row.id}`,
    query: { from: `/playbooks/${props.playbookId}` }
  })
}

function onRowSelect(_event: Event, row: TableRow<PlaybookEnrolment>) {
  openRun(row.original)
}

async function confirmExit() {
  if (confirmExitId.value == null) return
  const result = await cancelRun(confirmExitId.value)
  confirmExitId.value = null
  if (result) await refresh()
}

const columns = computed<Array<TableColumn<PlaybookEnrolment>>>(() => {
  const cols: Array<TableColumn<PlaybookEnrolment>> = [
    {
      id: 'subject',
      header: t('playbooks.enrolments.subject'),
      cell: ({ row }) => {
        const subject = row.original.subject
        return h('div', [
          h('div', { class: 'font-medium text-highlighted' }, subject.contact?.name ?? t('common.emptyValue')),
          h('div', {
            class: 'mt-0.5 flex flex-wrap gap-2 text-xs',
            onClick: (event: Event) => event.stopPropagation()
          }, [
            subject.contact
              ? h(NuxtLink, {
                  to: `/leasing/contacts/${subject.contact.id}`,
                  class: 'text-primary hover:underline'
                }, () => t('playbooks.enrolments.contactLink'))
              : null,
            subject.contract
              ? h(NuxtLink, {
                  to: `/leasing/contracts/${subject.contract.id}?tab=delinquency`,
                  class: 'text-primary hover:underline'
                }, () => t('playbooks.enrolments.contractLink'))
              : null,
            subject.deal
              ? h(NuxtLink, {
                  to: `/leasing/deals/${subject.deal.id}`,
                  class: 'text-primary hover:underline'
                }, () => t('playbooks.enrolments.dealLink'))
              : null
          ])
        ])
      }
    },
    {
      id: 'enrolled',
      header: t('playbooks.enrolments.enrolled'),
      cell: ({ row }) => formatDate(row.original.enrolledAt)
    }
  ]

  if (tab.value === 'active') {
    cols.push({
      id: 'progress',
      header: t('playbooks.enrolments.progress'),
      cell: ({ row }) => h(PlaybooksProgressDots, {
        completed: row.original.stepsCompleted,
        total: row.original.stepTotal,
        waiting: row.original.status === 'waiting',
        hint: progressHint(row.original)
      })
    })
  } else {
    cols.push({
      id: 'exitCause',
      header: t('playbooks.enrolments.exitCause'),
      cell: ({ row }) => h('div', [
        h('div', exitCauseLabel(row.original)),
        h('div', { class: 'mt-0.5 text-xs' }, t('playbooks.enrolments.stepsProgress', {
          done: row.original.stepsCompleted,
          total: row.original.stepTotal
        }))
      ])
    }, {
      id: 'duration',
      header: t('playbooks.enrolments.duration'),
      cell: ({ row }) => formatDuration(row.original.durationSeconds)
    })
  }

  cols.push({
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { th: 'w-28', td: 'w-28' } },
    cell: ({ row }) => tab.value !== 'active'
      ? null
      : h('div', {
          class: 'flex justify-end',
          onClick: (event: Event) => event.stopPropagation()
        }, [
          h(UButton, {
            label: t('playbooks.enrolments.manualExit'),
            size: 'xs',
            color: 'error',
            variant: 'ghost',
            onClick: () => { confirmExitId.value = row.original.id }
          })
        ])
  })

  return cols
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <UButton
        :label="$t('playbooks.enrolments.activeTab')"
        size="sm"
        :color="tab === 'active' ? 'primary' : 'neutral'"
        :variant="tab === 'active' ? 'solid' : 'ghost'"
        @click="tab = 'active'"
      />
      <UButton
        :label="$t('playbooks.enrolments.exitedTab')"
        size="sm"
        :color="tab === 'exited' ? 'primary' : 'neutral'"
        :variant="tab === 'exited' ? 'solid' : 'ghost'"
        @click="tab = 'exited'"
      />
      <span class="ml-auto text-xs text-muted">
        {{ $t('playbooks.enrolments.count', { count: totalCount }) }}
      </span>
    </div>

    <div
      v-if="pending"
      class="flex h-40 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="flex h-40 flex-col items-center justify-center gap-2"
    >
      <p class="text-sm text-dimmed">
        {{ $t('playbooks.enrolments.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        size="sm"
        variant="outline"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="enrolments.length === 0"
      class="rounded-xl border border-dashed border-default px-4 py-10 text-center text-sm text-muted"
    >
      {{ tab === 'active' ? $t('playbooks.enrolments.emptyActive') : $t('playbooks.enrolments.emptyExited') }}
    </div>

    <UTable
      v-else
      :data="enrolments"
      :columns="columns"
      :meta="{ class: { tr: 'cursor-pointer' } }"
      @select="onRowSelect"
    />

    <div
      v-if="lastPage > 1"
      class="flex items-center justify-end gap-2"
    >
      <UButton
        icon="i-lucide-chevron-left"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="!canGoPrev"
        @click="page--"
      />
      <span class="text-xs text-muted">{{ page }} / {{ lastPage }}</span>
      <UButton
        icon="i-lucide-chevron-right"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="!canGoNext"
        @click="page++"
      />
    </div>

    <UModal
      :open="confirmExitId != null"
      @update:open="(v: boolean) => { if (!v) confirmExitId = null }"
    >
      <template #content>
        <div class="p-6">
          <h2 class="text-base font-semibold text-highlighted">
            {{ $t('playbooks.enrolments.exitConfirmTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('playbooks.enrolments.exitConfirmBody') }}
          </p>
          <div class="mt-6 flex justify-end gap-2">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="outline"
              @click="confirmExitId = null"
            />
            <UButton
              :label="$t('playbooks.enrolments.manualExit')"
              color="error"
              :loading="cancelling"
              @click="confirmExit"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
