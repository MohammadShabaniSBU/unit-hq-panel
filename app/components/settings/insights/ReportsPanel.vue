<script setup lang="ts">
import { resolveInsightLabel, type InsightReport, type ValidationStatus } from '~/types/insights'
import type { InsightReportListStatus } from '~/composables/useInsightReports'
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const toast = useToast()
const { can } = usePermissions()

const canCredentials = computed(() => can(Permission.CredentialManage))

const {
  reports,
  pending,
  error,
  refresh,
  submitting,
  archive,
  unarchive,
  reorder,
  statusFilter
} = useInsightReports()

const { accounts, pending: accountsPending, refresh: refreshAccounts } = useAnalyticsAccounts({
  enabled: canCredentials
})
const { providers, refresh: refreshProviders } = useAnalyticsProviders({
  enabled: canCredentials
})

const formOpen = ref(false)
const editing = ref<InsightReport | null>(null)
const archiveTarget = ref<InsightReport | null>(null)

const statusItems = computed(() => [
  { value: 'active' as InsightReportListStatus, label: t('settings.insights.reports.statusActive') },
  { value: 'archived' as InsightReportListStatus, label: t('settings.insights.reports.statusArchived') },
  { value: 'all' as InsightReportListStatus, label: t('settings.insights.reports.statusAll') }
])

const canReorder = computed(() => statusFilter.value === 'active')

function isArchived(report: InsightReport): boolean {
  return report.archived_at != null
}

function reportLabel(report: InsightReport): string {
  return resolveInsightLabel(
    { label: report.resolved_label, label_source: report.label_source },
    t
  ) || report.key
}

function sourceLabel(report: InsightReport) {
  if (report.source === 'native') {
    return t('settings.insights.reports.sourceBuiltIn')
  }
  const account = accounts.value.find(row => row.id === report.analytics_account_id)
  if (!account) {
    return t('settings.insights.reports.sourceEmbedded')
  }
  return providers.value.find(row => row.key === account.provider)?.label ?? account.provider
}

function visibilityLabel(visibility: string) {
  if (visibility === 'company_only') {
    return t('settings.insights.reports.visibilityCompanyOnly')
  }
  if (visibility === 'site_staff') {
    return t('settings.insights.reports.visibilitySiteStaff')
  }
  return t('settings.insights.reports.visibilityAll')
}

function validationTooltip(report: InsightReport): string {
  const status = report.validation_status as ValidationStatus
  const statusLabel = t(`insights.validation.${status}`)
  const detailMessage = report.validation_detail?.message
  const instruction = report.validation_detail?.mismatches?.[0]?.instruction
  if (instruction) {
    return String(instruction)
  }
  if (detailMessage) {
    return String(detailMessage)
  }
  return statusLabel
}

function showValidationWarning(report: InsightReport) {
  return report.validation_status !== 'valid'
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(report: InsightReport) {
  editing.value = report
  formOpen.value = true
}

async function onMove(report: InsightReport, direction: -1 | 1) {
  const ids = reports.value.map(row => row.id)
  const index = ids.indexOf(report.id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ids.length) {
    return
  }

  const next = [...ids]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved!)

  const ok = await reorder(next)
  if (!ok) {
    toast.add({ title: t('settings.insights.reports.reorderError'), color: 'error' })
  }
}

async function onArchiveConfirm() {
  if (!archiveTarget.value) {
    return
  }
  const ok = await archive(archiveTarget.value.id)
  if (ok) {
    toast.add({ title: t('settings.insights.reports.archiveSuccess'), color: 'success' })
    archiveTarget.value = null
  }
}

async function onUnarchive(report: InsightReport) {
  const ok = await unarchive(report.id)
  if (ok) {
    toast.add({ title: t('settings.insights.reports.unarchiveSuccess'), color: 'success' })
  } else {
    toast.add({ title: t('settings.insights.reports.unarchiveError'), color: 'error' })
  }
}

function onRetry() {
  void refresh()
  void refreshAccounts()
  void refreshProviders()
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ t('settings.insights.reports.title') }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          value-key="value"
          label-key="label"
          class="w-40"
        />
        <UButton
          :label="t('settings.insights.reports.add')"
          icon="i-lucide-plus"
          color="primary"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="pending || accountsPending"
      class="flex items-center justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-dimmed"
      />
    </div>

    <SettingsLoadError
      v-else-if="error"
      :message="t('pages.settings.loadError')"
      @retry="onRetry"
    />

    <div
      v-else-if="reports.length === 0"
      class="rounded-lg border border-dashed border-default py-10 text-center text-sm text-dimmed"
    >
      {{ statusFilter === 'archived'
        ? t('settings.insights.reports.emptyArchived')
        : t('settings.insights.reports.empty') }}
    </div>

    <ul
      v-else
      class="divide-y divide-default rounded-lg border border-default"
    >
      <li
        v-for="(report, index) in reports"
        :key="report.id"
        class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="truncate text-sm font-medium text-highlighted">
              {{ reportLabel(report) }}
            </p>
            <UBadge
              color="neutral"
              variant="subtle"
              :label="sourceLabel(report)"
            />
            <UBadge
              color="neutral"
              variant="outline"
              :label="visibilityLabel(report.visibility)"
            />
            <UBadge
              v-if="isArchived(report)"
              color="neutral"
              variant="subtle"
              :label="t('settings.insights.reports.statusArchived')"
            />
            <UTooltip
              v-if="showValidationWarning(report)"
              :text="validationTooltip(report)"
            >
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-4 text-warning"
              />
            </UTooltip>
          </div>
          <p class="truncate text-xs text-dimmed">
            {{ report.key }}
            <template v-if="report.section">
              · {{ report.section }}
            </template>
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <UButton
            icon="i-lucide-arrow-up"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :disabled="!canReorder || index === 0 || submitting"
            :aria-label="t('settings.insights.reports.moveUp')"
            @click="onMove(report, -1)"
          />
          <UButton
            icon="i-lucide-arrow-down"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            :disabled="!canReorder || index === reports.length - 1 || submitting"
            :aria-label="t('settings.insights.reports.moveDown')"
            @click="onMove(report, 1)"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :label="t('settings.insights.reports.edit')"
            :disabled="isArchived(report)"
            @click="openEdit(report)"
          />
          <UButton
            v-if="isArchived(report)"
            size="xs"
            color="neutral"
            variant="ghost"
            :label="t('settings.insights.reports.unarchive')"
            :loading="submitting"
            @click="onUnarchive(report)"
          />
          <UButton
            v-else
            size="xs"
            color="error"
            variant="ghost"
            :label="t('settings.insights.reports.archive')"
            @click="archiveTarget = report"
          />
        </div>
      </li>
    </ul>

    <SettingsInsightsReportBuilderSlideover
      v-model:open="formOpen"
      :report="editing"
      :accounts="accounts"
      :existing-reports="reports"
    />

    <UModal
      :open="archiveTarget != null"
      @update:open="(value: boolean) => { if (!value) archiveTarget = null }"
    >
      <template #content>
        <div class="p-4 space-y-4">
          <p class="text-sm font-medium text-highlighted">
            {{ t('settings.insights.reports.archiveConfirmTitle') }}
          </p>
          <p class="text-sm text-dimmed">
            {{ t('settings.insights.reports.archiveConfirmBody', {
              name: archiveTarget ? reportLabel(archiveTarget) : ''
            }) }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('settings.insights.reports.cancel')"
              @click="archiveTarget = null"
            />
            <UButton
              color="error"
              :label="t('settings.insights.reports.archive')"
              :loading="submitting"
              @click="onArchiveConfirm"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
