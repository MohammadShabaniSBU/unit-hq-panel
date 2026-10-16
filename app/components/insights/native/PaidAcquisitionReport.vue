<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { formatMoney } from '~/composables/useMoney'
import { REPORT_CATALOG, useReport } from '~/composables/useReport'
import type { ReportFilters } from '~/types/report'

interface PaidKpi {
  currency: string
  spend: string
  paid_leads: number
  paid_move_ins: number
  cost_per_lead: string | null
  cost_per_move_in: string | null
}

interface PaidRow {
  row_kind?: string
  site_id: number | null
  site: string | null
  platform: string
  currency: string
  spend: string
  paid_leads: number
  paid_move_ins: number
  cost_per_lead: string | null
  cost_per_move_in: string | null
  roas: string | null
  roas_reason: string | null
}

interface PaidCampaign extends PaidRow {
  campaign_id: number
  campaign: string
  mapping_status: 'mapped' | 'unmapped'
}

const { t, locale } = useI18n()
const UBadge = resolveComponent('UBadge')
const UContainer = resolveComponent('UContainer')
const siteContext = useSiteContextStore()
const catalogEntry = REPORT_CATALOG.find(item => item.name === 'paid-acquisition') ?? null
const { result, pending, error, downloading, fetchReport, downloadCsv } = useReport('paid-acquisition')
const { from: periodFrom, to: periodTo, setPeriod } = usePaidAcquisitionReport()

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false
})

const from = ref<string | undefined>(periodFrom.value)
const to = ref<string | undefined>(periodTo.value)
const platform = ref('all')
const attributionWindow = ref(90)
const fromInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)
const toInput = ref<{ inputsRef?: Array<{ $el?: HTMLElement }> } | null>(null)

const platformOptions = computed(() => [
  { label: t('pages.insights.paidAcquisition.allPlatforms'), value: 'all' },
  { label: t('pages.insights.paidAcquisition.googleAds'), value: 'google_ads' },
  { label: t('pages.insights.paidAcquisition.meta'), value: 'meta' }
])

const windowOptions = computed(() => [
  { label: t('pages.insights.paidAcquisition.window30'), value: 30 },
  { label: t('pages.insights.paidAcquisition.window60'), value: 60 },
  { label: t('pages.insights.paidAcquisition.window90'), value: 90 }
])

function parseIsoDate(value: string | undefined): CalendarDate | null {
  if (!value) {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

function formatIsoDate(value: CalendarDate | null): string | undefined {
  if (!value) {
    return undefined
  }
  const month = String(value.month).padStart(2, '0')
  const day = String(value.day).padStart(2, '0')
  return `${String(value.year).padStart(4, '0')}-${month}-${day}`
}

function dateModel(source: Ref<string | undefined>) {
  return computed({
    get: () => parseIsoDate(source.value),
    set: (value: CalendarDate | null) => {
      source.value = formatIsoDate(value)
    }
  })
}

const fromDate = dateModel(from)
const toDate = dateModel(to)

function currentFilters(): ReportFilters {
  const filters: ReportFilters = {
    platform: platform.value,
    attribution_window: attributionWindow.value
  }
  if (from.value) {
    filters.from = from.value
  }
  if (to.value) {
    filters.to = to.value
  }
  const siteId = siteContext.selectedSiteId
  if (typeof siteId === 'number') {
    filters.site_ids = [siteId]
  }
  return filters
}

async function load() {
  await fetchReport(currentFilters())
}

function onApply() {
  if (from.value === periodFrom.value && to.value === periodTo.value) {
    void load()
    return
  }
  void setPeriod(from.value, to.value)
}

function onCsv() {
  void downloadCsv(currentFilters())
}

onMounted(() => {
  void load()
})

watch([periodFrom, periodTo], ([nextFrom, nextTo]) => {
  from.value = nextFrom
  to.value = nextTo
  void load()
})

watch(() => siteContext.selectedSiteId, () => {
  void load()
})

const kpis = computed<Array<PaidKpi>>(() => {
  const meta = result.value?.meta
  if (!meta || !Array.isArray(meta.kpis)) {
    return []
  }
  return meta.kpis as Array<PaidKpi>
})

const campaigns = computed<Array<PaidCampaign>>(() => {
  const meta = result.value?.meta
  if (!meta || !Array.isArray(meta.campaigns)) {
    return []
  }
  return meta.campaigns as Array<PaidCampaign>
})

const siteRows = computed<Array<PaidRow>>(() => (result.value?.rows ?? []) as unknown as Array<PaidRow>)

function dash(): string {
  return t('common.emptyValue')
}

function money(value: string | null, currency: string): string {
  if (value == null || value === '') {
    return dash()
  }
  return formatMoney(value, currency, locale.value)
}

function siteLabel(row: { row_kind?: string, site: string | null }): string {
  if (row.row_kind === 'unmapped' || row.site == null) {
    return t('pages.insights.paidAcquisition.unmapped')
  }
  return row.site
}

function platformLabel(value: string): string {
  if (value === 'google_ads') {
    return t('pages.insights.paidAcquisition.googleAds')
  }
  if (value === 'meta') {
    return t('pages.insights.paidAcquisition.meta')
  }
  return value
}

function roasLabel(row: { roas: string | null, roas_reason: string | null }): string {
  if (row.roas == null) {
    return dash()
  }
  return row.roas
}

function roasTip(reason: string | null): string {
  if (reason === 'currency_mismatch') {
    return t('pages.insights.paidAcquisition.roasCurrencyMismatch')
  }
  if (reason === 'no_spend') {
    return t('pages.insights.paidAcquisition.roasNoSpend')
  }
  return ''
}

const siteColumns = computed<Array<TableColumn<PaidRow>>>(() => [
  {
    id: 'site',
    accessorKey: 'site',
    header: t('pages.insights.filters.site'),
    cell: ({ row }) => siteLabel(row.original)
  },
  {
    id: 'platform',
    accessorKey: 'platform',
    header: t('pages.insights.filters.platform'),
    cell: ({ row }) => platformLabel(row.original.platform)
  },
  {
    id: 'currency',
    accessorKey: 'currency',
    header: t('pages.insights.paidAcquisition.currency'),
    cell: ({ row }) => row.original.currency
  },
  {
    id: 'spend',
    accessorKey: 'spend',
    header: t('pages.insights.paidAcquisition.spend'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.spend, row.original.currency))
  },
  {
    id: 'paid_leads',
    accessorKey: 'paid_leads',
    header: t('pages.insights.paidAcquisition.paidLeads'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.paid_leads))
  },
  {
    id: 'paid_move_ins',
    accessorKey: 'paid_move_ins',
    header: t('pages.insights.paidAcquisition.paidMoveIns'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.paid_move_ins))
  },
  {
    id: 'cost_per_lead',
    accessorKey: 'cost_per_lead',
    header: t('pages.insights.paidAcquisition.costPerLead'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.cost_per_lead, row.original.currency))
  },
  {
    id: 'cost_per_move_in',
    accessorKey: 'cost_per_move_in',
    header: t('pages.insights.paidAcquisition.costPerMoveIn'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.cost_per_move_in, row.original.currency))
  },
  {
    id: 'roas',
    accessorKey: 'roas',
    header: t('pages.insights.paidAcquisition.roas'),
    cell: ({ row }) => h('span', {
      class: 'tabular-nums',
      title: roasTip(row.original.roas_reason)
    }, roasLabel(row.original))
  }
])

const campaignColumns = computed<Array<TableColumn<PaidCampaign>>>(() => [
  {
    id: 'campaign',
    accessorKey: 'campaign',
    header: t('pages.insights.paidAcquisition.campaign'),
    cell: ({ row }) => row.original.campaign
  },
  {
    id: 'platform',
    accessorKey: 'platform',
    header: t('pages.insights.filters.platform'),
    cell: ({ row }) => platformLabel(row.original.platform)
  },
  {
    id: 'mapping_status',
    accessorKey: 'mapping_status',
    header: t('pages.insights.paidAcquisition.mapped'),
    cell: ({ row }) => h(UBadge, {
      color: row.original.mapping_status === 'unmapped' ? 'warning' : 'success',
      variant: 'subtle',
      label: row.original.mapping_status === 'unmapped'
        ? t('pages.insights.paidAcquisition.unmappedStatus')
        : t('pages.insights.paidAcquisition.mapped')
    })
  },
  {
    id: 'currency',
    accessorKey: 'currency',
    header: t('pages.insights.paidAcquisition.currency'),
    cell: ({ row }) => row.original.currency
  },
  {
    id: 'spend',
    accessorKey: 'spend',
    header: t('pages.insights.paidAcquisition.spend'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.spend, row.original.currency))
  },
  {
    id: 'paid_leads',
    accessorKey: 'paid_leads',
    header: t('pages.insights.paidAcquisition.paidLeads'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.paid_leads))
  },
  {
    id: 'paid_move_ins',
    accessorKey: 'paid_move_ins',
    header: t('pages.insights.paidAcquisition.paidMoveIns'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, String(row.original.paid_move_ins))
  },
  {
    id: 'cost_per_lead',
    accessorKey: 'cost_per_lead',
    header: t('pages.insights.paidAcquisition.costPerLead'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.cost_per_lead, row.original.currency))
  },
  {
    id: 'cost_per_move_in',
    accessorKey: 'cost_per_move_in',
    header: t('pages.insights.paidAcquisition.costPerMoveIn'),
    cell: ({ row }) => h('span', { class: 'tabular-nums' }, money(row.original.cost_per_move_in, row.original.currency))
  },
  {
    id: 'roas',
    accessorKey: 'roas',
    header: t('pages.insights.paidAcquisition.roas'),
    cell: ({ row }) => h('span', {
      class: 'tabular-nums',
      title: roasTip(row.original.roas_reason)
    }, roasLabel(row.original))
  }
])
</script>

<template>
  <component
    :is="props.embedded ? 'div' : UContainer"
    class="report-page"
    :class="props.embedded ? undefined : 'py-4'"
  >
    <div
      v-if="!props.embedded"
      class="mb-4"
    >
      <UButton
        to="/insights"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
        size="sm"
      >
        {{ $t('pages.insights.backToIndex') }}
      </UButton>
    </div>

    <div
      v-if="!props.embedded"
      class="mb-6"
    >
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ catalogEntry ? $t(catalogEntry.titleKey) : $t('pages.insights.reports.paidAcquisition.title') }}
      </h1>
      <p
        v-if="catalogEntry"
        class="mt-1 text-sm text-dimmed"
      >
        {{ $t(catalogEntry.descriptionKey) }}
      </p>
    </div>

    <div class="mb-6 flex flex-wrap items-end gap-3">
      <UFormField :label="$t('pages.insights.filters.from')">
        <UInputDate
          ref="fromInput"
          v-model="fromDate"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="fromInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('pages.insights.filters.from')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="fromDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
      <UFormField :label="$t('pages.insights.filters.to')">
        <UInputDate
          ref="toInput"
          v-model="toDate"
          class="w-44"
        >
          <template #trailing>
            <UPopover :reference="toInput?.inputsRef?.[3]?.$el">
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-calendar"
                :aria-label="$t('pages.insights.filters.to')"
                class="px-0"
              />
              <template #content>
                <UCalendar
                  v-model="toDate"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>
      </UFormField>
      <UFormField :label="$t('pages.insights.filters.platform')">
        <USelect
          v-model="platform"
          :items="platformOptions"
          value-key="value"
          class="w-48"
        />
      </UFormField>
      <UFormField :label="$t('pages.insights.filters.window')">
        <USelect
          v-model="attributionWindow"
          :items="windowOptions"
          value-key="value"
          class="w-40"
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
    </div>

    <p
      v-if="error"
      class="text-error mb-4 text-sm"
    >
      {{ error }}
    </p>

    <div
      v-if="kpis.length"
      class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="kpi in kpis"
        :key="kpi.currency"
        class="border-default rounded-lg border p-4"
      >
        <p class="text-muted text-sm">
          {{ kpi.currency }}
        </p>
        <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-muted">
              {{ $t('pages.insights.paidAcquisition.spend') }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ money(kpi.spend, kpi.currency) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('pages.insights.paidAcquisition.paidLeads') }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ kpi.paid_leads }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('pages.insights.paidAcquisition.paidMoveIns') }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ kpi.paid_move_ins }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('pages.insights.paidAcquisition.costPerLead') }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ money(kpi.cost_per_lead, kpi.currency) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ $t('pages.insights.paidAcquisition.costPerMoveIn') }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ money(kpi.cost_per_move_in, kpi.currency) }}
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <InsightsChartGrid
      v-if="result?.charts?.length"
      :charts="result.charts"
    />

    <h2 class="mt-8 mb-3 text-lg font-semibold">
      {{ $t('pages.insights.paidAcquisition.sitePlatform') }}
    </h2>
    <UTable
      :data="siteRows"
      :columns="siteColumns"
      :loading="pending"
      class="w-full"
    />

    <h2 class="mt-8 mb-3 text-lg font-semibold">
      {{ $t('pages.insights.paidAcquisition.campaigns') }}
    </h2>
    <UTable
      :data="campaigns"
      :columns="campaignColumns"
      :loading="pending"
      class="w-full"
    />

    <p class="text-muted mt-4 text-sm">
      {{ $t('pages.insights.paidAcquisition.timezoneCaveat') }}
    </p>
  </component>
</template>
