<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import type { ApiDelinquencyCase, DaysBucket } from '~/types/delinquency'

const { t, locale } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')
const BillingDelinquencyLadderDots = resolveComponent('BillingDelinquencyLadderDots')
const CallsCallButton = resolveComponent('CallsCallButton')

const {
  cases,
  meta,
  total,
  showingCount,
  status,
  siteId,
  daysBucket,
  paused,
  overlocked,
  page,
  perPage,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  setStatus,
  setDaysBucket,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useDelinquencyList()

const { isCompanyWide } = usePermissions()
const { siteOptions } = useSiteFilterOptions(() => t('billing.delinquency.filters.allSites'))

watch(siteOptions, (options) => {
  if (!isCompanyWide.value && siteId.value === null && options[0]?.value != null) {
    siteId.value = options[0].value
  }
}, { immediate: true })

const dayBuckets: Array<{ key: DaysBucket | null, label: string }> = [
  { key: null, label: t('billing.delinquency.filters.allDays') },
  { key: '1-7', label: t('billing.delinquency.filters.days1to7') },
  { key: '8-14', label: t('billing.delinquency.filters.days8to14') },
  { key: '15-30', label: t('billing.delinquency.filters.days15to30') },
  { key: '30+', label: t('billing.delinquency.filters.days30plus') }
]

function contractLabel(row: ApiDelinquencyCase): string {
  const unit = row.unit_numbers?.[0]
  const name = row.contact_name
  if (unit && name) return `${unit} · ${name}`
  if (name) return name
  if (unit) return unit
  return `#${row.contract_id}`
}

function goToCase(row: ApiDelinquencyCase) {
  navigateTo(`/leasing/contracts/${row.contract_id}?tab=delinquency`)
}

function onRowSelect(_event: Event, row: TableRow<ApiDelinquencyCase>) {
  goToCase(row.original)
}

const columns = computed<Array<TableColumn<ApiDelinquencyCase>>>(() => [
  {
    id: 'contract',
    header: t('billing.delinquency.columns.contract'),
    cell: ({ row }) => h('span', {
      class: 'font-medium text-highlighted'
    }, contractLabel(row.original))
  },
  {
    id: 'days',
    header: t('billing.delinquency.columns.daysOverdue'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' },
      row.original.days_overdue != null
        ? t('billing.delinquency.daysCount', { days: row.original.days_overdue })
        : t('common.emptyValue'))
  },
  {
    id: 'amount',
    header: t('billing.delinquency.columns.overdue'),
    cell: ({ row }) => {
      const r = row.original
      const tip = t('billing.delinquency.overdueSplit', {
        rent: formatMoney(r.overdue_rent, r.currency ?? 'EUR', locale.value),
        fees: formatMoney(r.overdue_fees, r.currency ?? 'EUR', locale.value)
      })
      return h(resolveComponent('UTooltip'), { text: tip }, {
        default: () => h('span', { class: 'tabular-nums text-error' },
          formatMoney(r.overdue_total, r.currency ?? 'EUR', locale.value))
      })
    }
  },
  {
    id: 'ladder',
    header: t('billing.delinquency.columns.ladder'),
    cell: ({ row }) => h(BillingDelinquencyLadderDots, {
      steps: row.original.policy_steps,
      executedIds: row.original.executed_policy_step_ids,
      nextStep: row.original.next_step,
      compact: true
    })
  },
  {
    id: 'flags',
    header: t('billing.delinquency.columns.flags'),
    cell: ({ row }) => {
      const nodes = []
      if (row.original.is_paused) {
        nodes.push(h(UBadge, {
          label: t('billing.delinquency.paused'),
          color: 'neutral',
          variant: 'subtle',
          size: 'sm'
        }))
      }
      if (row.original.overlocked) {
        nodes.push(h(UIcon, {
          name: 'i-lucide-lock',
          class: 'size-4 text-error'
        }))
      }
      return h('div', { class: 'flex items-center gap-2' }, nodes)
    }
  },
  {
    id: 'last_payment',
    header: t('billing.delinquency.columns.lastPayment'),
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' },
      row.original.last_payment_at
        ? formatDateTime(row.original.last_payment_at)
        : t('common.emptyValue'))
  },
  {
    id: 'autopay',
    header: t('billing.delinquency.columns.autopay'),
    cell: ({ row }) => {
      if (row.original.failed_autopay) {
        return h(UBadge, {
          label: t('billing.autopay.statuses.failed'),
          color: 'warning',
          variant: 'subtle',
          size: 'sm'
        })
      }
      if (row.original.autopay_enabled) {
        return h(UBadge, {
          label: t('billing.autopay.enabled'),
          color: 'success',
          variant: 'subtle',
          size: 'sm'
        })
      }
      return h('span', { class: 'text-dimmed' }, t('billing.autopay.disabled'))
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const contactId = row.original.contact_id
      if (!contactId) {
        return null
      }
      return h('div', {
        class: 'flex justify-end',
        onClick: (e: Event) => e.stopPropagation()
      }, [
        h(CallsCallButton, {
          contactId,
          contextType: 'delinquency',
          contextId: row.original.id,
          iconOnly: true,
          size: 'xs',
          color: 'neutral',
          variant: 'ghost'
        })
      ])
    }
  }
])
</script>

<template>
  <UContainer class="flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-8">
    <div class="shrink-0">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ $t('billing.delinquency.title') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('billing.delinquency.subtitle') }}
      </p>
    </div>

    <div class="mt-4 flex shrink-0 flex-wrap items-center gap-2">
      <UBadge
        v-for="row in (meta?.overdue_by_currency ?? [])"
        :key="row.currency"
        color="error"
        variant="subtle"
        :label="`${row.currency} ${formatMoney(row.amount, row.currency, locale)}`"
      />
      <UBadge
        color="neutral"
        variant="subtle"
        :label="$t('billing.delinquency.chips.open', { count: meta?.open_count ?? 0 })"
      />
      <UBadge
        color="error"
        variant="subtle"
        :label="$t('billing.delinquency.chips.overlocked', { count: meta?.overlocked_count ?? 0 })"
      />
      <UBadge
        v-if="(meta?.failed_autopay_count ?? 0) > 0"
        color="warning"
        variant="subtle"
        :label="$t('billing.autopay.failedCount', { count: meta?.failed_autopay_count })"
      />
    </div>

    <div class="mt-6 flex shrink-0 flex-wrap items-center gap-2">
      <UButton
        :variant="status === 'open' ? 'solid' : 'ghost'"
        class="rounded-full"
        size="sm"
        :label="$t('billing.delinquency.tabs.open')"
        @click="setStatus('open')"
      />
      <UButton
        :variant="status === 'cured' ? 'solid' : 'ghost'"
        class="rounded-full"
        size="sm"
        :label="$t('billing.delinquency.tabs.history')"
        @click="setStatus('cured')"
      />

      <div class="mx-2 h-5 w-px bg-default" />

      <USelect
        v-model="siteId"
        :items="siteOptions"
        value-key="value"
        label-key="label"
        class="w-48"
        size="sm"
      />

      <UButton
        v-for="bucket in dayBuckets"
        :key="String(bucket.key)"
        :variant="daysBucket === bucket.key ? 'solid' : 'ghost'"
        class="rounded-full"
        size="sm"
        :label="bucket.label"
        @click="setDaysBucket(bucket.key)"
      />

      <UButton
        :variant="paused === true ? 'solid' : 'ghost'"
        class="rounded-full"
        size="sm"
        :label="$t('billing.delinquency.filters.paused')"
        @click="paused = paused === true ? null : true"
      />
      <UButton
        :variant="overlocked === true ? 'solid' : 'ghost'"
        class="rounded-full"
        size="sm"
        :label="$t('billing.delinquency.filters.overlocked')"
        @click="overlocked = overlocked === true ? null : true"
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
        {{ $t('billing.delinquency.loadError') }}
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
      v-else-if="!cases.length"
      class="mt-6 rounded-lg border border-dashed border-default px-6 py-16 text-center"
    >
      <p class="font-medium">
        {{ $t('billing.delinquency.emptyTitle') }}
      </p>
      <p class="mt-1 text-sm text-dimmed">
        {{ $t('billing.delinquency.emptyBody') }}
      </p>
    </div>

    <template v-else>
      <div class="mt-6 min-h-0 flex-1">
        <UTable
          :data="cases"
          :columns="columns"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        class="shrink-0"
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
  </UContainer>
</template>
