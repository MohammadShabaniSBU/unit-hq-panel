<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import type { TableColumn } from '@nuxt/ui'
import type { AiUsageCurrencyTotal, AiUsageGroupBy, AiUsageReportRow } from '~/types/ai'

const { t, locale } = useI18n()

const {
  rows,
  meta,
  pending,
  error,
  refresh,
  from,
  to,
  groupBy
} = useAiUsageReport()

const { items: employeeOptions } = useEmployeesOptions()

function parseIsoDate(value: string): CalendarDate | undefined {
  if (!value.trim()) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new CalendarDate(year, month, day)
}

function formatIsoDate(value: CalendarDate | null | undefined): string {
  if (!value) return ''
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const dateRange = computed({
  get: () => ({ start: parseIsoDate(from.value), end: parseIsoDate(to.value) }),
  set: (value: { start?: CalendarDate, end?: CalendarDate } | null) => {
    from.value = formatIsoDate(value?.start)
    to.value = formatIsoDate(value?.end)
  }
})

const groupByItems = computed(() => [
  { value: 'employee' as AiUsageGroupBy, label: t('settings.ai.usage.groupBy.employee') },
  { value: 'model' as AiUsageGroupBy, label: t('settings.ai.usage.groupBy.model') },
  { value: 'purpose' as AiUsageGroupBy, label: t('settings.ai.usage.groupBy.purpose') },
  { value: 'day' as AiUsageGroupBy, label: t('settings.ai.usage.groupBy.day') }
])

function employeeLabel(employeeId: number | null | undefined): string {
  if (employeeId == null) {
    return t('settings.ai.usage.unknownEmployee')
  }
  return employeeOptions.value.find(option => option.value === employeeId)?.label ?? `#${employeeId}`
}

function groupLabel(row: AiUsageReportRow): string {
  switch (groupBy.value) {
    case 'employee':
      return employeeLabel(row.employee_id)
    case 'model':
      return row.model ?? t('settings.ai.usage.unknownValue')
    case 'purpose':
      return row.purpose ?? t('settings.ai.usage.unknownValue')
    case 'day':
      return row.day ?? t('settings.ai.usage.unknownValue')
    default:
      return t('settings.ai.usage.unknownValue')
  }
}

interface FlatRow extends AiUsageCurrencyTotal {
  groupLabel: string
}

const flatRows = computed<Array<FlatRow>>(() => rows.value.flatMap((row) => {
  const label = groupLabel(row)
  return row.currencies.map(currency => ({ ...currency, groupLabel: label }))
}))

function formatCost(row: FlatRow) {
  return formatMoney(row.estimated_cost, row.currency, locale.value)
}

const hasCachedTokens = computed(() => flatRows.value.some(row => row.cached_input_tokens > 0))

const visibleColumns = computed<Array<TableColumn<FlatRow>>>(() => {
  const columns: Array<TableColumn<FlatRow>> = [
    {
      accessorKey: 'groupLabel',
      header: t(`settings.ai.usage.groupBy.${groupBy.value}`)
    },
    {
      accessorKey: 'input_tokens',
      header: t('settings.ai.usage.columns.inputTokens'),
      cell: ({ row }) => row.original.input_tokens.toLocaleString(locale.value)
    }
  ]

  if (hasCachedTokens.value) {
    columns.push({
      accessorKey: 'cached_input_tokens',
      header: t('settings.ai.usage.columns.cachedTokens'),
      cell: ({ row }) => row.original.cached_input_tokens.toLocaleString(locale.value)
    })
  }

  columns.push(
    {
      accessorKey: 'output_tokens',
      header: t('settings.ai.usage.columns.outputTokens'),
      cell: ({ row }) => row.original.output_tokens.toLocaleString(locale.value)
    },
    {
      accessorKey: 'tool_calls',
      header: t('settings.ai.usage.columns.toolCalls'),
      cell: ({ row }) => row.original.tool_calls.toLocaleString(locale.value)
    },
    {
      id: 'cost',
      header: t('settings.ai.usage.columns.cost'),
      cell: ({ row }) => formatCost(row.original)
    }
  )

  return columns
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-3">
      <UFormField :label="t('settings.ai.usage.filters.dateRange')">
        <UInputDate
          v-model="dateRange"
          range
          class="w-full sm:w-72"
        />
      </UFormField>
      <UFormField :label="t('settings.ai.usage.filters.groupBy')">
        <USelect
          v-model="groupBy"
          :items="groupByItems"
          value-key="value"
          label-key="label"
          class="w-40"
        />
      </UFormField>
    </div>

    <p
      v-if="meta && meta.orphaned_count > 0"
      class="mt-4 text-sm text-warning"
    >
      {{ t('settings.ai.usage.orphanedNotice', { count: meta.orphaned_count }) }}
    </p>
    <p
      v-if="meta && meta.estimated_token_share > 0"
      class="mt-1 text-sm text-dimmed"
    >
      {{ t('settings.ai.usage.estimatedNotice') }}
    </p>

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
        :title="t('settings.ai.usage.loadError')"
        :actions="[{
          label: t('common.retry'),
          color: 'neutral',
          variant: 'outline',
          onClick: () => refresh()
        }]"
      />

      <div
        v-else-if="!flatRows.length"
        class="rounded-lg border border-dashed border-default px-6 py-16 text-center"
      >
        <p class="font-medium">
          {{ t('settings.ai.usage.empty') }}
        </p>
      </div>

      <UTable
        v-else
        :data="flatRows"
        :columns="visibleColumns"
      />
    </div>
  </div>
</template>
