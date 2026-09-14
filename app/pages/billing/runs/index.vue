<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import type {
  ApiBillingRun,
  ApiBillingRunPreviewRow,
  BillingRunTrigger
} from '~/types/billing'
import { Permission } from '~/types/permissions'

const { t, locale } = useI18n()
const { formatDateTime: formatOrgDateTime } = useOrgDateFormat()
const toast = useToast()
const { can } = usePermissions()
const canRunBilling = computed(() => can(Permission.BillingRunExecute))
const UBadge = resolveComponent('UBadge')

const {
  runs,
  total,
  showingCount,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  previewing,
  running,
  previewRun,
  executeRun,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useBillingRunList()

const modalOpen = ref(false)
const previewRows = ref<Array<ApiBillingRunPreviewRow>>([])
const previewLoaded = ref(false)
const previewError = ref<string | null>(null)

function formatDateTime(value: string | null): string {
  return formatOrgDateTime(value, { empty: t('common.emptyValue') })
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return t('common.emptyValue')
  if (seconds < 1) return t('billing.runs.durationMs', { ms: Math.round(seconds * 1000) })
  if (seconds < 60) return t('billing.runs.durationSeconds', { seconds: seconds.toFixed(1) })
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return t('billing.runs.durationMinutes', { minutes, seconds: rem })
}

function triggerColor(trigger: BillingRunTrigger): 'primary' | 'neutral' | 'warning' {
  switch (trigger) {
    case 'manual':
      return 'primary'
    case 'retry':
      return 'warning'
    default:
      return 'neutral'
  }
}

function onRowSelect(_event: Event, row: TableRow<ApiBillingRun>) {
  navigateTo(`/billing/runs/${row.original.id}`)
}

async function openRunModal() {
  modalOpen.value = true
  previewLoaded.value = false
  previewRows.value = []
  previewError.value = null
  try {
    previewRows.value = await previewRun()
    previewLoaded.value = true
  } catch (e: unknown) {
    previewError.value = e instanceof Error ? e.message : t('billing.runs.previewError')
  }
}

async function confirmRealRun() {
  try {
    const run = await executeRun()
    modalOpen.value = false
    toast.add({
      title: t('billing.runs.runSuccess', {
        billed: run.contracts_billed,
        failed: run.contracts_failed
      }),
      color: 'success'
    })
    await navigateTo(`/billing/runs/${run.id}`)
  } catch (e: unknown) {
    toast.add({
      title: e instanceof Error ? e.message : t('billing.runs.runError'),
      color: 'error'
    })
  }
}

const columns = computed<Array<TableColumn<ApiBillingRun>>>(() => [
  {
    id: 'started',
    header: t('billing.runs.columns.started'),
    cell: ({ row }) => h('div', {}, [
      h('span', { class: 'font-medium text-highlighted tabular-nums' }, `#${row.original.id}`),
      h('p', { class: 'mt-0.5 text-xs text-dimmed' }, formatDateTime(row.original.started_at))
    ])
  },
  {
    id: 'trigger',
    header: t('billing.runs.columns.trigger'),
    cell: ({ row }) => h(UBadge, {
      label: t(`billing.runs.triggers.${row.original.trigger}`),
      color: triggerColor(row.original.trigger),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'duration',
    header: t('billing.runs.columns.duration'),
    cell: ({ row }) => h('span', { class: 'text-sm text-dimmed tabular-nums' }, formatDuration(row.original.duration_seconds))
  },
  {
    id: 'counts',
    header: t('billing.runs.columns.counts'),
    cell: ({ row }) => {
      const failed = row.original.contracts_failed
      return h('div', { class: 'flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums' }, [
        h('span', {}, t('billing.runs.countBilled', { count: row.original.contracts_billed })),
        h('span', { class: 'text-dimmed' }, t('billing.runs.countSkipped', { count: row.original.contracts_skipped })),
        h('span', {
          class: failed > 0 ? 'font-medium text-error' : 'text-dimmed'
        }, t('billing.runs.countFailed', { count: failed }))
      ])
    }
  },
  {
    id: 'totals',
    header: t('billing.runs.columns.totals'),
    cell: ({ row }) => {
      const totals = row.original.totals_by_currency
      if (!totals.length) {
        return h('span', { class: 'text-sm text-dimmed' }, t('common.emptyValue'))
      }
      return h('div', { class: 'flex flex-col gap-0.5 text-sm tabular-nums' },
        totals.map(total => h('span', {}, formatMoney(total.amount, total.currency, locale.value)))
      )
    }
  }
])
</script>

<template>
  <UContainer class="flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-8">
    <div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('billing.runs.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('billing.runs.subtitle') }}
        </p>
      </div>

      <UButton
        v-if="canRunBilling"
        color="primary"
        icon="i-lucide-play"
        class="shrink-0"
        :label="$t('billing.runs.runNow')"
        @click="openRunModal"
      />
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('billing.runs.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <div
      v-else-if="!runs.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('billing.runs.emptyTitle') }}
      </p>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('billing.runs.emptyBody') }}
      </p>
      <UButton
        v-if="canRunBilling"
        class="mt-4"
        color="primary"
        icon="i-lucide-play"
        :label="$t('billing.runs.runNow')"
        @click="openRunModal"
      />
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1">
        <UTable
          :data="runs"
          :columns="columns"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
        />
      </div>

      <FacilityListPagination
        class="shrink-0"
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="total"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <UModal
      v-model:open="modalOpen"
      :title="$t('billing.runs.runNow')"
      :description="$t('billing.runs.previewHint')"
    >
      <template #body>
        <div
          v-if="previewing || !previewLoaded"
          class="flex justify-center py-8"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-muted"
          />
        </div>
        <UAlert
          v-else-if="previewError"
          color="error"
          variant="subtle"
          :title="previewError"
        />
        <div
          v-else-if="!previewRows.length"
          class="rounded-lg border border-dashed border-default px-4 py-8 text-center text-sm text-muted"
        >
          {{ $t('billing.runs.previewEmpty') }}
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-left text-dimmed">
                <th class="py-2 pe-3 font-medium">
                  {{ $t('billing.runs.columns.contract') }}
                </th>
                <th class="py-2 pe-3 font-medium">
                  {{ $t('billing.runs.columns.periods') }}
                </th>
                <th class="py-2 pe-3 font-medium">
                  {{ $t('billing.runs.columns.window') }}
                </th>
                <th class="py-2 font-medium">
                  {{ $t('billing.runs.columns.estAmount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in previewRows"
                :key="row.contract_id"
                class="border-b border-default/60"
              >
                <td class="py-2 pe-3">
                  <NuxtLink
                    :to="`/leasing/contracts/${row.contract_id}`"
                    class="font-medium text-highlighted hover:underline"
                    @click.stop
                  >
                    #{{ row.contract_id }}
                  </NuxtLink>
                </td>
                <td class="py-2 pe-3 tabular-nums">
                  {{ row.periods }}
                </td>
                <td class="py-2 pe-3 text-dimmed tabular-nums">
                  <template v-if="row.window_start && row.window_end">
                    {{ row.window_start }} → {{ row.window_end }}
                  </template>
                  <template v-else>
                    {{ $t('common.emptyValue') }}
                  </template>
                </td>
                <td class="py-2 tabular-nums">
                  {{ row.est_amount }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="modalOpen = false"
          />
          <UButton
            :label="$t('billing.runs.confirmRun')"
            color="primary"
            :loading="running"
            :disabled="!previewLoaded || !!previewError"
            @click="confirmRealRun"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
