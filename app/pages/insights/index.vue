<script setup lang="ts">
import { REPORT_CATALOG } from '~/composables/useReport'
import { dashboardDrillTo, useDashboard } from '~/composables/useDashboard'
import { formatMoney } from '~/composables/useMoney'
import type { DashboardCardKey, ReportFilters } from '~/types/report'

const { t, locale } = useI18n()
const { meta, pending, error, fetchDashboard } = useDashboard()
const { isCompanyWide } = usePermissions()
const { siteOptions } = useSiteFilterOptions(() => t('pages.insights.filters.allSites'))

const siteId = ref<number | null>(null)

watch(siteOptions, (options) => {
  if (!isCompanyWide.value && siteId.value === null && options[0]?.value != null) {
    siteId.value = options[0].value
  }
}, { immediate: true })

const cardOrder: Array<DashboardCardKey> = [
  'occupancy',
  'monthly_rent',
  'overdue',
  'open_delinquency_cases',
  'movement_net'
]

function currentFilters(): ReportFilters {
  const filters: ReportFilters = {}
  if (siteId.value != null) {
    filters.site_ids = [siteId.value]
  }
  return filters
}

async function load() {
  await fetchDashboard(currentFilters())
}

watch(siteId, () => {
  void load()
}, { immediate: true })

function formatDelta(delta: string | number | null, currency: string | null): string {
  if (delta == null || delta === '') {
    return t('common.emptyValue')
  }
  if (currency) {
    const n = Number(delta)
    const sign = n > 0 ? '+' : ''
    return `${sign}${formatMoney(delta, currency, locale.value)}`
  }
  const n = Number(delta)
  if (Number.isNaN(n)) {
    return String(delta)
  }
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}

function cardValue(key: DashboardCardKey): string {
  const card = meta.value?.cards[key]
  if (!card) {
    return t('common.emptyValue')
  }
  if (key === 'occupancy') {
    return card.value == null ? t('common.emptyValue') : `${card.value}%`
  }
  if (key === 'monthly_rent' || key === 'overdue') {
    return formatMoney(card.value ?? '0.00', card.currency, locale.value)
  }
  return String(card.value ?? t('common.emptyValue'))
}

function cardSecondary(key: DashboardCardKey): string | null {
  const card = meta.value?.cards[key]
  if (!card?.secondary) {
    return null
  }
  if (key === 'occupancy') {
    const rate = card.secondary.economic_rate
    return rate == null
      ? null
      : t('pages.insights.dashboard.economicBeneath', { rate })
  }
  if (key === 'overdue') {
    return t('pages.insights.dashboard.contractCount', {
      count: Number(card.secondary.contract_count ?? 0)
    })
  }
  if (key === 'movement_net') {
    return t('pages.insights.dashboard.moveInOut', {
      ins: Number(card.secondary.move_ins ?? 0),
      outs: Number(card.secondary.move_outs ?? 0)
    })
  }
  return null
}

function cardLink(key: DashboardCardKey): string {
  const card = meta.value?.cards[key]
  if (!card) {
    return '/insights'
  }
  return dashboardDrillTo(card.to, card.filters)
}

const occupancyPoints = computed(() =>
  (meta.value?.trends.occupancy.series ?? []).map(p => ({
    label: p.month_end.slice(0, 7),
    unit: p.unit_rate,
    economic: p.economic_rate
  }))
)

const collectionsPoints = computed(() =>
  (meta.value?.trends.collections.series ?? []).map(p => ({
    label: p.month.slice(5),
    charged: p.charged,
    allocated: p.allocated,
    currency: p.currency
  }))
)

const liveAttention = computed(() =>
  (meta.value?.attention ?? []).filter(chip => chip.count > 0)
)
</script>

<template>
  <UContainer class="py-8">
    <UPageHeader
      :title="$t('pages.insights.dashboard.title')"
      :description="$t('pages.insights.dashboard.subtitle')"
      class="mb-6"
    >
      <template #links>
        <USelect
          v-model="siteId"
          :items="siteOptions"
          value-key="value"
          label-key="label"
          class="w-48"
        />
      </template>
    </UPageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
      class="mb-4"
    />

    <div
      v-if="pending && !meta"
      class="text-muted py-12 text-center text-sm"
    >
      {{ $t('common.loading') }}
    </div>

    <template v-else-if="meta">
      <div class="flex flex-col gap-6">
        <!-- Attention first on mobile; KPIs lead on md+ -->
        <section
          class="order-1 md:order-2"
          aria-labelledby="attention-heading"
        >
          <h2
            id="attention-heading"
            class="text-highlighted mb-3 text-sm font-medium"
          >
            {{ $t('pages.insights.dashboard.attentionTitle') }}
          </h2>
          <div
            v-if="liveAttention.length"
            class="flex flex-wrap gap-2"
          >
            <NuxtLink
              v-for="chip in liveAttention"
              :key="chip.key"
              :to="dashboardDrillTo(chip.to, chip.filters)"
            >
              <UBadge
                color="warning"
                variant="subtle"
                size="lg"
                :label="$t(`pages.insights.dashboard.attention.${chip.key}`, { count: chip.count })"
              />
            </NuxtLink>
          </div>
          <p
            v-else
            class="text-muted text-sm"
          >
            {{ $t('pages.insights.dashboard.attentionEmpty') }}
          </p>
        </section>

        <section
          class="order-2 md:order-1"
          aria-labelledby="kpi-heading"
        >
          <h2
            id="kpi-heading"
            class="text-highlighted mb-3 text-sm font-medium"
          >
            {{ $t('pages.insights.dashboard.kpiTitle') }}
            <span class="text-muted font-normal">
              · {{ $t('pages.insights.filters.asOf') }} {{ meta.as_of }}
            </span>
          </h2>
          <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <li
              v-for="key in cardOrder"
              :key="key"
            >
              <NuxtLink
                :to="cardLink(key)"
                class="block rounded-lg border border-default bg-default p-4 transition hover:border-primary"
              >
                <p class="text-muted text-xs">
                  {{ $t(`pages.insights.dashboard.cards.${key}`) }}
                </p>
                <p class="text-highlighted mt-1 text-2xl font-semibold tabular-nums">
                  {{ cardValue(key) }}
                </p>
                <p
                  v-if="cardSecondary(key)"
                  class="text-muted mt-0.5 text-xs"
                >
                  {{ cardSecondary(key) }}
                </p>
                <p class="text-muted mt-2 text-xs tabular-nums">
                  {{ $t('pages.insights.dashboard.vsLastMonth') }}
                  {{ formatDelta(meta.cards[key].delta, meta.cards[key].currency) }}
                </p>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="order-3 grid gap-6 lg:grid-cols-2">
          <div class="rounded-lg border border-default p-4">
            <h2 class="text-highlighted mb-2 text-sm font-medium">
              {{ $t('pages.insights.dashboard.occupancyTrend') }}
            </h2>
            <p class="text-muted mb-3 text-xs">
              {{ $t('pages.insights.dashboard.occupancyLegend') }}
            </p>
            <InsightsReportSparkline
              :points="occupancyPoints"
              :note="$t('pages.insights.dashboard.occupancyAxis')"
            />
          </div>
          <div class="rounded-lg border border-default p-4">
            <h2 class="text-highlighted mb-2 text-sm font-medium">
              {{ $t('pages.insights.dashboard.collectionsTrend') }}
            </h2>
            <p class="text-muted mb-3 text-xs">
              {{ $t('pages.insights.dashboard.collectionsLegend') }}
            </p>
            <InsightsReportBars
              :points="collectionsPoints"
              :note="meta.trends.collections.note"
            />
          </div>
        </section>

        <section
          class="order-4"
          aria-labelledby="catalog-heading"
        >
          <h2
            id="catalog-heading"
            class="text-highlighted mb-3 text-sm font-medium"
          >
            {{ $t('pages.insights.dashboard.allReports') }}
          </h2>
          <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="report in REPORT_CATALOG"
              :key="report.name"
            >
              <NuxtLink
                :to="report.to"
                class="block rounded-lg border border-default bg-default p-5 transition hover:border-primary"
              >
                <h3 class="text-highlighted font-medium">
                  {{ t(report.titleKey) }}
                </h3>
                <p class="text-muted mt-1 text-sm">
                  {{ t(report.descriptionKey) }}
                </p>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </UContainer>
</template>
