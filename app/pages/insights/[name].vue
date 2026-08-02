<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import { REPORT_CATALOG, useReport } from '~/composables/useReport'
import type { ReportColumn, ReportFilters } from '~/types/report'

interface OccupancyHeadline {
  occupied?: number | string
  rentable?: number | string
  numerator?: string
  denominator?: string
  currency?: string
  rate?: number | null
  formula?: string
}

interface ReportFooter {
  units?: number
  area_m2?: string
  monthly_rent?: string
  deposits?: string
  overdue?: string
  currency?: string
}

interface TrendPoint {
  month_end: string
  unit_rate?: number | null
  area_rate?: number | null
  economic_rate?: number | null
  occupied_units?: number
  rentable_units?: number
}

interface MoneyTotal {
  currency: string
  amount: string
}

interface ChargeViewRow {
  bucket: string
  charge_type: string
  amount: string
  currency: string
}

interface PromiseKeptMeta {
  promised?: number
  kept?: number
  broken?: number
  kept_rate?: number | null
}

interface AutopayMeta {
  failed?: number
  recovered?: number
  recovery_rate?: number | null
}

const route = useRoute()
const { t, locale } = useI18n()
const name = computed(() => String(route.params.name))

const catalogEntry = computed(() =>
  REPORT_CATALOG.find(r => r.name === name.value) ?? null
)

const isOccupancy = computed(() => name.value === 'occupancy')
const isAgeing = computed(() => name.value === 'ageing')
const isCollections = computed(() => name.value === 'collections')
const isDailyClose = computed(() => name.value === 'daily-close')
const showAsOf = computed(() => !isCollections.value)
const showPeriod = computed(() => isCollections.value || name.value === 'occupancy')

const { result, pending, error, downloading, fetchReport, downloadCsv } = useReport(name)

const { items: siteItems } = useOptions('/api/sites/options')

const siteId = ref<number | null>(null)
const asOf = ref<string | undefined>(undefined)
const from = ref<string | undefined>(undefined)
const to = ref<string | undefined>(undefined)

const siteOptions = computed(() => [
  { label: t('pages.insights.filters.allSites'), value: null as number | null },
  ...siteItems.value.map(s => ({ label: s.label, value: Number(s.value) }))
])

function currentFilters(): ReportFilters {
  const filters: ReportFilters = {}
  if (siteId.value != null) {
    filters.site_ids = [siteId.value]
  }
  if (asOf.value) {
    filters.as_of = asOf.value
  }
  if (from.value) {
    filters.from = from.value
  }
  if (to.value) {
    filters.to = to.value
  }
  return filters
}

async function load() {
  if (!catalogEntry.value) {
    return
  }
  await fetchReport(currentFilters())
}

watch(name, () => {
  void load()
}, { immediate: true })

function formatCell(column: ReportColumn, value: string | number | null): string {
  if (value == null || value === '') {
    return t('common.emptyValue')
  }

  if (column.type === 'money') {
    return formatMoney(value, column.currency, locale.value)
  }

  if (column.type === 'percent') {
    return `${value}%`
  }

  return String(value)
}

const columns = computed<Array<TableColumn<Record<string, string | number | null>>>>(() => {
  if (!result.value) {
    return []
  }

  return result.value.columns.map(column => ({
    id: column.key,
    accessorKey: column.key,
    header: column.label,
    cell: ({ row }) => h('span', {
      class: column.type === 'money' || column.type === 'int' || column.type === 'percent'
        ? 'tabular-nums'
        : undefined
    }, formatCell(column, row.original[column.key] ?? null))
  }))
})

const headlines = computed(() => {
  if (!isOccupancy.value) {
    return null
  }
  const meta = result.value?.meta
  if (!meta || typeof meta !== 'object') {
    return null
  }
  const hlines = meta.headlines
  if (!hlines || typeof hlines !== 'object') {
    return null
  }
  return hlines as Record<string, OccupancyHeadline>
})

const footer = computed(() => {
  const meta = result.value?.meta
  if (!meta || typeof meta !== 'object' || !meta.footer) {
    return null
  }
  return meta.footer as ReportFooter
})

const series = computed(() => {
  const meta = result.value?.meta
  if (!meta || typeof meta !== 'object' || !Array.isArray(meta.series)) {
    return [] as Array<TrendPoint>
  }
  return meta.series as Array<TrendPoint>
})

const notes = computed(() => {
  const meta = result.value?.meta
  if (!meta || typeof meta !== 'object' || !Array.isArray(meta.notes)) {
    return [] as Array<string>
  }
  return meta.notes as Array<string>
})

const cashSubtotal = computed(() => {
  if (!isDailyClose.value) {
    return null
  }
  const meta = result.value?.meta
  if (!meta || typeof meta !== 'object') {
    return null
  }
  const amount = meta.cash_subtotal
  if (typeof amount !== 'string') {
    return null
  }
  const byCurrency = Array.isArray(meta.cash_by_currency)
    ? meta.cash_by_currency as Array<MoneyTotal>
    : []
  return {
    amount,
    currency: byCurrency[0]?.currency ?? null
  }
})

const chargeBucketTotals = computed(() => {
  if (!isAgeing.value) {
    return [] as Array<{ bucket: string, amount: string }>
  }
  const meta = result.value?.meta
  const totals = meta?.charge_bucket_totals
  if (!totals || typeof totals !== 'object') {
    return [] as Array<{ bucket: string, amount: string }>
  }
  return Object.entries(totals as Record<string, string>).map(([bucket, amount]) => ({
    bucket,
    amount
  }))
})

const chargeView = computed(() => {
  if (!isAgeing.value) {
    return [] as Array<ChargeViewRow>
  }
  const rows = result.value?.meta?.charge_view
  if (!Array.isArray(rows)) {
    return [] as Array<ChargeViewRow>
  }
  return rows as Array<ChargeViewRow>
})

const promiseKept = computed(() => {
  if (!isCollections.value) {
    return null
  }
  const meta = result.value?.meta?.promise_kept
  if (!meta || typeof meta !== 'object') {
    return null
  }
  return meta as PromiseKeptMeta
})

const autopayMeta = computed(() => {
  if (!isCollections.value) {
    return null
  }
  const meta = result.value?.meta?.autopay
  if (!meta || typeof meta !== 'object') {
    return null
  }
  return meta as AutopayMeta
})

const daysToCure = computed(() => {
  if (!isCollections.value) {
    return null
  }
  const meta = result.value?.meta?.days_to_cure
  if (!meta || typeof meta !== 'object') {
    return null
  }
  return meta as { cured_count?: number, average_days?: number | null }
})

const overlockCorrelation = computed(() => {
  if (!isCollections.value) {
    return null
  }
  const meta = result.value?.meta?.overlock_correlation
  if (!meta || typeof meta !== 'object') {
    return null
  }
  return meta as {
    with_overlock?: number
    without_overlock?: number
    caveat?: string
  }
})

const promiseWindowDays = computed(() => {
  const days = result.value?.meta?.promise_window_days
  return typeof days === 'number' ? days : 7
})

function formatRate(rate: number | null | undefined): string {
  if (rate == null) {
    return t('common.emptyValue')
  }
  return `${rate}%`
}

function printReport() {
  if (!import.meta.client) {
    return
  }
  window.print()
}

function onApply() {
  void load()
}

async function onCsv() {
  await downloadCsv(currentFilters())
}
</script>

<template>
  <UContainer class="report-page py-8">
    <div class="print:hidden mb-6">
      <UButton
        to="/insights"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        size="sm"
        class="mb-4"
      >
        {{ $t('pages.insights.backToIndex') }}
      </UButton>
    </div>

    <UPageHeader
      :title="catalogEntry ? $t(catalogEntry.titleKey) : $t('pages.insights.unknownReport')"
      :description="catalogEntry ? $t(catalogEntry.descriptionKey) : undefined"
      class="mb-6"
    />

    <div
      v-if="!catalogEntry"
      class="text-muted"
    >
      {{ $t('pages.insights.unknownReport') }}
    </div>

    <template v-else>
      <div class="print:hidden mb-6 flex flex-wrap items-end gap-3">
        <UFormField :label="$t('pages.insights.filters.site')">
          <USelect
            v-model="siteId"
            :items="siteOptions"
            value-key="value"
            class="w-56"
          />
        </UFormField>
        <UFormField
          v-if="showAsOf"
          :label="$t('pages.insights.filters.asOf')"
        >
          <UInput
            v-model="asOf"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UFormField
          v-if="showPeriod"
          :label="$t('pages.insights.filters.from')"
        >
          <UInput
            v-model="from"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UFormField
          v-if="showPeriod"
          :label="$t('pages.insights.filters.to')"
        >
          <UInput
            v-model="to"
            type="date"
            class="w-44"
          />
        </UFormField>
        <UButton
          color="primary"
          :loading="pending"
          @click="onApply"
        >
          {{ $t('pages.insights.apply') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          :loading="downloading"
          @click="onCsv"
        >
          {{ $t('pages.insights.exportCsv') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-printer"
          @click="printReport"
        >
          {{ $t('pages.insights.print') }}
        </UButton>
      </div>

      <p
        v-if="error"
        class="text-error mb-4 text-sm"
      >
        {{ error }}
      </p>

      <div
        v-if="headlines"
        class="mb-6 grid gap-4 sm:grid-cols-3"
      >
        <div
          v-for="key in ['unit', 'area', 'economic'] as const"
          :key="key"
          class="border-default rounded-lg border p-4"
        >
          <p class="text-muted text-sm">
            {{ $t(`pages.insights.headlines.${key}`) }}
          </p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">
            {{ formatRate(headlines[key]?.rate) }}
          </p>
          <p
            v-if="key !== 'economic'"
            class="text-muted mt-2 text-xs tabular-nums"
            :title="headlines[key]?.formula"
          >
            {{ $t('pages.insights.headlines.occupied') }}:
            {{ headlines[key]?.occupied }}
            /
            {{ $t('pages.insights.headlines.rentable') }}:
            {{ headlines[key]?.rentable }}
          </p>
          <p
            v-else
            class="text-muted mt-2 text-xs tabular-nums"
            :title="headlines.economic?.formula"
          >
            {{ $t('pages.insights.headlines.formula') }}:
            {{ headlines.economic?.numerator }}
            /
            {{ headlines.economic?.denominator }}
            {{ headlines.economic?.currency }}
          </p>
        </div>
      </div>

      <div
        v-if="cashSubtotal"
        class="border-default mb-6 rounded-lg border p-4"
      >
        <p class="text-muted text-sm">
          {{ $t('pages.insights.drawerNumber') }}
        </p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">
          {{ formatMoney(cashSubtotal.amount, cashSubtotal.currency, locale) }}
        </p>
      </div>

      <div
        v-if="isAgeing && chargeBucketTotals.length"
        class="mb-6"
      >
        <h2 class="mb-3 text-base font-medium">
          {{ $t('pages.insights.ageingBuckets') }}
        </h2>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums">
          <span
            v-for="bucket in chargeBucketTotals"
            :key="bucket.bucket"
          >
            {{ bucket.bucket }}: {{ bucket.amount }}
          </span>
        </div>
        <div
          v-if="chargeView.length"
          class="text-muted mt-2 text-xs"
        >
          <span
            v-for="row in chargeView"
            :key="`${row.bucket}-${row.charge_type}`"
            class="mr-3 inline-block"
          >
            {{ row.bucket }} / {{ row.charge_type }}: {{ row.amount }} {{ row.currency }}
          </span>
        </div>
      </div>

      <div
        v-if="isCollections && promiseKept"
        class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div class="border-default rounded-lg border p-4">
          <p class="text-muted text-sm">
            {{ $t('pages.insights.promiseKept') }}
          </p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">
            {{ promiseKept.kept_rate == null ? $t('common.emptyValue') : `${promiseKept.kept_rate}%` }}
          </p>
          <p class="text-muted mt-2 text-xs">
            {{ $t('pages.insights.promiseWindow', { days: promiseWindowDays }) }}
            · {{ promiseKept.kept }}/{{ promiseKept.promised }}
          </p>
        </div>
        <div class="border-default rounded-lg border p-4">
          <p class="text-muted text-sm">
            {{ $t('pages.insights.autopayRecovery') }}
          </p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">
            {{ autopayMeta?.recovery_rate == null ? $t('common.emptyValue') : `${autopayMeta.recovery_rate}%` }}
          </p>
          <p class="text-muted mt-2 text-xs tabular-nums">
            {{ autopayMeta?.recovered }}/{{ autopayMeta?.failed }}
          </p>
        </div>
        <div class="border-default rounded-lg border p-4">
          <p class="text-muted text-sm">
            {{ $t('pages.insights.daysToCure') }}
          </p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">
            {{ daysToCure?.average_days == null ? $t('common.emptyValue') : daysToCure.average_days }}
          </p>
          <p class="text-muted mt-2 text-xs tabular-nums">
            n={{ daysToCure?.cured_count ?? 0 }}
          </p>
        </div>
        <div class="border-default rounded-lg border p-4">
          <p class="text-muted text-sm">
            {{ $t('pages.insights.overlockCorrelation') }}
          </p>
          <p class="mt-1 text-lg font-semibold tabular-nums">
            {{ overlockCorrelation?.with_overlock ?? 0 }}
            /
            {{ overlockCorrelation?.without_overlock ?? 0 }}
          </p>
          <p class="text-muted mt-2 text-xs">
            {{ $t('pages.insights.correlationCaveat') }}
          </p>
        </div>
      </div>

      <div class="report-table-wrap">
        <UTable
          :data="result?.rows ?? []"
          :columns="columns"
          :loading="pending"
          class="w-full"
        />
      </div>

      <div
        v-if="footer"
        class="border-default mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm tabular-nums"
      >
        <span>{{ $t('pages.insights.footerUnits') }}: {{ footer.units }}</span>
        <span>{{ $t('pages.insights.footerArea') }}: {{ footer.area_m2 }}</span>
        <span>
          {{ $t('pages.insights.footerMonthlyRent') }}:
          {{ formatMoney(footer.monthly_rent ?? '0', footer.currency ?? null, locale) }}
        </span>
        <span>
          {{ $t('pages.insights.footerDeposits') }}:
          {{ formatMoney(footer.deposits ?? '0', footer.currency ?? null, locale) }}
        </span>
        <span>
          {{ $t('pages.insights.footerOverdue') }}:
          {{ formatMoney(footer.overdue ?? '0', footer.currency ?? null, locale) }}
        </span>
      </div>

      <p
        v-if="notes.length || footer"
        class="text-muted mt-3 text-sm"
      >
        {{ notes[0] || $t('pages.insights.balanceHonesty') }}
      </p>

      <div
        v-if="series.length"
        class="mt-8"
      >
        <h2 class="mb-3 text-base font-medium">
          {{ $t('pages.insights.trendTitle') }}
        </h2>
        <div class="report-table-wrap overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-default border-b text-left">
                <th class="py-2 pr-4 font-medium">
                  {{ $t('pages.insights.trendMonth') }}
                </th>
                <th class="py-2 pr-4 font-medium">
                  {{ $t('pages.insights.headlines.unit') }}
                </th>
                <th class="py-2 pr-4 font-medium">
                  {{ $t('pages.insights.headlines.area') }}
                </th>
                <th class="py-2 font-medium">
                  {{ $t('pages.insights.headlines.economic') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="point in series"
                :key="point.month_end"
                class="border-default border-b"
              >
                <td class="py-2 pr-4 tabular-nums">
                  {{ point.month_end }}
                </td>
                <td class="py-2 pr-4 tabular-nums">
                  {{ formatRate(point.unit_rate) }}
                </td>
                <td class="py-2 pr-4 tabular-nums">
                  {{ formatRate(point.area_rate) }}
                </td>
                <td class="py-2 tabular-nums">
                  {{ formatRate(point.economic_rate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer class="report-definitions-footer text-muted mt-8 border-t border-default pt-4 text-sm">
        {{ $t('pages.insights.definitionsFooter') }}
        <span class="text-highlighted">docs/report-definitions.md</span>
      </footer>
    </template>
  </UContainer>
</template>
