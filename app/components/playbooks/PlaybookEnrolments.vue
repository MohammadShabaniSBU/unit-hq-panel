<script setup lang="ts">
import type { EnrolmentListStatus, PlaybookEnrolment } from '~/types/playbook'

const props = defineProps<{
  playbookId: number
  playbookKind: 'debt_process' | 'lead_chase'
}>()

const { t } = useI18n()
const { formatDateTime: formatOrgDateTime } = useOrgDateFormat()
const { resumesIn } = useAutomationRunPresentation()
const { cancelRun, cancelling } = useAutomationRunCancel()

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

async function confirmExit() {
  if (confirmExitId.value == null) return
  const result = await cancelRun(confirmExitId.value)
  confirmExitId.value = null
  if (result) await refresh()
}
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

    <div
      v-else
      class="overflow-hidden rounded-xl border border-default"
    >
      <table class="w-full text-sm">
        <thead class="border-b border-default bg-elevated/40 text-left text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              {{ $t('playbooks.enrolments.subject') }}
            </th>
            <th class="px-4 py-3 font-medium">
              {{ $t('playbooks.enrolments.enrolled') }}
            </th>
            <th
              v-if="tab === 'active'"
              class="px-4 py-3 font-medium"
            >
              {{ $t('playbooks.enrolments.progress') }}
            </th>
            <th
              v-else
              class="px-4 py-3 font-medium"
            >
              {{ $t('playbooks.enrolments.exitCause') }}
            </th>
            <th
              v-if="tab === 'exited'"
              class="px-4 py-3 font-medium"
            >
              {{ $t('playbooks.enrolments.duration') }}
            </th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in enrolments"
            :key="row.id"
            class="cursor-pointer border-b border-default last:border-0 hover:bg-elevated/30"
            @click="openRun(row)"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-highlighted">
                {{ row.subject.contact?.name ?? $t('common.emptyValue') }}
              </div>
              <div class="mt-0.5 flex flex-wrap gap-2 text-xs">
                <NuxtLink
                  v-if="row.subject.contact"
                  :to="`/leasing/contacts/${row.subject.contact.id}`"
                  class="text-primary hover:underline"
                  @click.stop
                >
                  {{ $t('playbooks.enrolments.contactLink') }}
                </NuxtLink>
                <NuxtLink
                  v-if="row.subject.contract"
                  :to="`/leasing/contracts/${row.subject.contract.id}?tab=delinquency`"
                  class="text-primary hover:underline"
                  @click.stop
                >
                  {{ $t('playbooks.enrolments.contractLink') }}
                </NuxtLink>
                <NuxtLink
                  v-if="row.subject.deal"
                  :to="`/leasing/deals/${row.subject.deal.id}`"
                  class="text-primary hover:underline"
                  @click.stop
                >
                  {{ $t('playbooks.enrolments.dealLink') }}
                </NuxtLink>
              </div>
            </td>
            <td class="px-4 py-3 text-muted">
              {{ formatDate(row.enrolledAt) }}
            </td>
            <td
              v-if="tab === 'active'"
              class="px-4 py-3"
            >
              <PlaybooksProgressDots
                :completed="row.stepsCompleted"
                :total="row.stepTotal"
                :waiting="row.status === 'waiting'"
                :hint="progressHint(row)"
              />
            </td>
            <td
              v-else
              class="px-4 py-3 text-muted"
            >
              <div>{{ exitCauseLabel(row) }}</div>
              <div class="mt-0.5 text-xs">
                {{ $t('playbooks.enrolments.stepsProgress', { done: row.stepsCompleted, total: row.stepTotal }) }}
              </div>
            </td>
            <td
              v-if="tab === 'exited'"
              class="px-4 py-3 text-muted"
            >
              {{ formatDuration(row.durationSeconds) }}
            </td>
            <td class="px-4 py-3 text-right">
              <UButton
                v-if="tab === 'active'"
                :label="$t('playbooks.enrolments.manualExit')"
                size="xs"
                color="error"
                variant="ghost"
                @click.stop="confirmExitId = row.id"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
