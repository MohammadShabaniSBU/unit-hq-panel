<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import type {
  ApiBillingRun,
  ApiBillingRunPreviewRow,
  BillingRunTrigger
} from '~/types/billing'

const { t, locale } = useI18n()
const toast = useToast()
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
  goToNextPage
} = useBillingRunList()

const modalOpen = ref(false)
const previewRows = ref<Array<ApiBillingRunPreviewRow>>([])
const previewLoaded = ref(false)
const previewError = ref<string | null>(null)

function formatDateTime(value: string | null): string {
  if (!value) return t('common.emptyValue')
  return new Date(value.replace(' ', 'T')).toLocaleString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

function openRun(run: ApiBillingRun) {
  navigateTo(`/billing/runs/${run.id}`)
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
    cell: ({ row }) => h('button', {
      type: 'button',
      class: 'text-left',
      onClick: () => openRun(row.original)
    }, [
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
  <UContainer class="py-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <UPageHeader
        :title="$t('billing.runs.title')"
        :description="$t('billing.runs.subtitle')"
      />
      <UButton
        color="primary"
        icon="i-lucide-play"
        :label="$t('billing.runs.runNow')"
        @click="openRunModal"
      />
    </div>

    <div class="mt-6">
      <div
        v-if="pending"
        class="flex justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="subtle"
        :title="$t('billing.runs.loadError')"
        :actions="[{
          label: $t('common.retry'),
          color: 'neutral',
          variant: 'outline',
          onClick: () => refresh()
        }]"
      />

      <div
        v-else-if="!runs.length"
        class="rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <p class="font-medium">
          {{ $t('billing.runs.emptyTitle') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ $t('billing.runs.emptyBody') }}
        </p>
        <UButton
          class="mt-4"
          color="primary"
          icon="i-lucide-play"
          :label="$t('billing.runs.runNow')"
          @click="openRunModal"
        />
      </div>

      <template v-else>
        <UTable
          :data="runs"
          :columns="columns"
        />
        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-sm text-muted">
            {{ $t('common.showing', { count: showingCount, total }) }}
          </p>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-left"
              :disabled="!canGoPrev"
              @click="goToPrevPage"
            />
            <span class="text-sm tabular-nums">
              {{ page }} / {{ lastPage }}
            </span>
            <UButton
              size="sm"
              variant="outline"
              icon="i-lucide-chevron-right"
              :disabled="!canGoNext"
              @click="goToNextPage"
            />
            <USelect
              v-model="perPage"
              :items="[25, 50, 100]"
              class="w-20"
            />
          </div>
        </div>
      </template>
    </div>

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
