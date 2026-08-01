<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import type {
  ApiBillingRunItem,
  BillingRunItemOutcome,
  BillingRunTrigger
} from '~/types/billing'

const route = useRoute()
const { t, locale } = useI18n()
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const runId = computed(() => String(route.params.id))
const {
  run,
  items,
  outcomeFilter,
  pending,
  error,
  refresh
} = useBillingRun(runId)

const defaultFilterApplied = ref(false)
watch(run, (value) => {
  if (!value || defaultFilterApplied.value) return
  if (value.contracts_failed > 0) {
    outcomeFilter.value = 'failed'
  }
  defaultFilterApplied.value = true
}, { immediate: true })

const tabs = computed(() => [
  { key: 'all' as const, label: t('billing.runs.filters.all') },
  { key: 'billed' as const, label: t('billing.runs.outcomes.billed') },
  { key: 'skipped' as const, label: t('billing.runs.outcomes.skipped') },
  { key: 'failed' as const, label: t('billing.runs.outcomes.failed') }
])

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
  if (seconds < 60) return t('billing.runs.durationSeconds', { seconds: seconds.toFixed(1) })
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return t('billing.runs.durationMinutes', { minutes, seconds: rem })
}

function outcomeColor(outcome: BillingRunItemOutcome): 'success' | 'error' | 'neutral' {
  switch (outcome) {
    case 'billed':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'neutral'
  }
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

function contractLabel(item: ApiBillingRunItem): string {
  const unit = item.contract?.unit_number
  const name = item.contract?.contact_name
  if (unit && name) return `${unit} · ${name}`
  if (name) return name
  if (unit) return unit
  return `#${item.contract_id}`
}

function reasonLabel(detail: string | null): string {
  if (!detail) return t('common.emptyValue')
  const key = `billing.runs.reasons.${detail}`
  return t(key) === key ? detail : t(key)
}

function contextAction(item: ApiBillingRunItem): { label: string, to: string } | null {
  if (item.outcome !== 'failed' || !item.detail) return null
  if (item.detail === 'fiscal_blocker' && item.contract?.contact_id) {
    return {
      label: t('billing.runs.actions.completeFiscal'),
      to: `/leasing/contacts/${item.contract.contact_id}#fiscal`
    }
  }
  if (item.detail === 'catch_up_cap' || item.detail === 'currency_mismatch') {
    return {
      label: t('billing.runs.actions.viewContract'),
      to: `/leasing/contracts/${item.contract_id}`
    }
  }
  return null
}

const columns = computed<Array<TableColumn<ApiBillingRunItem>>>(() => [
  {
    id: 'contract',
    header: t('billing.runs.columns.contract'),
    cell: ({ row }) => h('a', {
      class: 'font-medium text-highlighted hover:underline',
      href: `/leasing/contracts/${row.original.contract_id}`,
      onClick: (e: Event) => {
        e.preventDefault()
        navigateTo(`/leasing/contracts/${row.original.contract_id}`)
      }
    }, contractLabel(row.original))
  },
  {
    id: 'outcome',
    header: t('billing.runs.columns.outcome'),
    cell: ({ row }) => h(UBadge, {
      label: t(`billing.runs.outcomes.${row.original.outcome}`),
      color: outcomeColor(row.original.outcome),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'periods',
    header: t('billing.runs.columns.periods'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.periods_billed))
  },
  {
    id: 'amount',
    header: t('billing.runs.columns.amount'),
    cell: ({ row }) => {
      if (row.original.amount_total == null || !row.original.currency) {
        return h('span', { class: 'text-dimmed' }, t('common.emptyValue'))
      }
      return h('span', { class: 'tabular-nums' }, formatMoney(
        row.original.amount_total,
        row.original.currency,
        locale.value
      ))
    }
  },
  {
    id: 'invoices',
    header: t('billing.runs.columns.invoices'),
    cell: ({ row }) => {
      const ids = row.original.invoice_ids ?? []
      if (!ids.length) {
        return h('span', { class: 'text-dimmed' }, t('common.emptyValue'))
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, ids.map(id => h('a', {
        class: 'text-sm text-highlighted hover:underline tabular-nums',
        href: `/billing/invoices`,
        onClick: (e: Event) => {
          e.preventDefault()
          navigateTo({ path: '/billing/invoices', query: { invoice: String(id) } })
        }
      }, `#${id}`)))
    }
  },
  {
    id: 'autopay',
    header: t('billing.runs.columns.autopay'),
    cell: ({ row }) => {
      const status = row.original.autopay ?? 'off'
      const color = status === 'collected'
        ? 'success'
        : status === 'failed'
          ? 'error'
          : status === 'pending'
            ? 'warning'
            : 'neutral'
      return h(UBadge, {
        label: t(`billing.runs.autopay.${status}`),
        color,
        variant: 'subtle',
        size: 'sm'
      })
    }
  },
  {
    id: 'detail',
    header: t('billing.runs.columns.reason'),
    cell: ({ row }) => {
      if (row.original.outcome === 'billed') {
        return h('span', { class: 'text-dimmed' }, t('common.emptyValue'))
      }
      const children: Array<ReturnType<typeof h>> = [
        h('span', { class: 'text-sm' }, reasonLabel(row.original.detail))
      ]
      if (row.original.error_message) {
        children.push(h('details', { class: 'mt-1 text-xs text-dimmed' }, [
          h('summary', { class: 'cursor-pointer' }, t('billing.runs.showMessage')),
          h('p', { class: 'mt-1 whitespace-pre-wrap' }, row.original.error_message)
        ]))
      }
      return h('div', children)
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const action = contextAction(row.original)
      if (!action) return null
      return h(UButton, {
        size: 'xs',
        variant: 'soft',
        color: 'primary',
        label: action.label,
        onClick: () => navigateTo(action.to)
      })
    }
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-4">
      <UButton
        to="/billing/runs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="sm"
        :label="$t('billing.runs.backToList')"
      />
    </div>

    <div
      v-if="pending && !run"
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

    <template v-else-if="run">
      <div class="flex flex-wrap items-center gap-3">
        <UPageHeader
          :title="$t('billing.runs.detailTitle', { id: run.id })"
          :description="formatDateTime(run.started_at)"
        />
        <UBadge
          :label="$t(`billing.runs.triggers.${run.trigger}`)"
          :color="triggerColor(run.trigger)"
          variant="subtle"
        />
      </div>

      <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-dimmed">
        <span>{{ $t('billing.runs.columns.duration') }}: {{ formatDuration(run.duration_seconds) }}</span>
        <span>{{ $t('billing.runs.horizon', { date: run.horizon_date }) }}</span>
        <span>{{ $t('billing.runs.countBilled', { count: run.contracts_billed }) }}</span>
        <span>{{ $t('billing.runs.countSkipped', { count: run.contracts_skipped }) }}</span>
        <span :class="run.contracts_failed > 0 ? 'font-medium text-error' : ''">
          {{ $t('billing.runs.countFailed', { count: run.contracts_failed }) }}
        </span>
      </div>

      <div
        v-if="run.totals_by_currency.length"
        class="mt-3 flex flex-wrap gap-2"
      >
        <UBadge
          v-for="total in run.totals_by_currency"
          :key="total.currency"
          :label="formatMoney(total.amount, total.currency, locale)"
          color="neutral"
          variant="subtle"
        />
      </div>

      <div
        v-if="run.contracts_considered === 0"
        class="mt-4 rounded-lg border border-default bg-elevated/30 px-4 py-3 text-sm text-dimmed"
      >
        {{ $t('billing.runs.nothingDue') }}
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-1 border-b border-default pb-3">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          color="neutral"
          :variant="outcomeFilter === tab.key ? 'solid' : 'ghost'"
          size="sm"
          class="rounded-full"
          @click="outcomeFilter = tab.key"
        >
          {{ tab.label }}
        </UButton>
      </div>

      <div class="mt-4">
        <div
          v-if="pending"
          class="flex justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-muted"
          />
        </div>
        <div
          v-else-if="!items.length"
          class="rounded-lg border border-dashed border-default px-6 py-12 text-center text-sm text-muted"
        >
          {{ $t('billing.runs.itemsEmpty') }}
        </div>
        <UTable
          v-else
          :data="items"
          :columns="columns"
        />
      </div>
    </template>
  </UContainer>
</template>
