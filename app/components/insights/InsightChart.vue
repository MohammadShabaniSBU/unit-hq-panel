<script setup lang="ts">
import { formatMoney } from '~/composables/useMoney'
import type { ChartFormat, ChartSeries, ChartSpec } from '~/types/report'

const props = defineProps<{
  spec: ChartSpec
}>()

const { t, locale } = useI18n()
const colorMode = useColorMode()

const chartHeight = 320

function categoryLabel(value: string): string {
  if (props.spec.category_kind === 'month') {
    const [year, month] = value.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return new Intl.DateTimeFormat(locale.value, { month: 'short', year: '2-digit' }).format(date)
  }
  if (props.spec.category_kind === 'label_key') {
    return t(value)
  }
  return value
}

function seriesName(series: ChartSeries): string {
  return series.name_key ? t(series.name_key) : (series.name ?? '')
}

function formatValue(value: number | null, format: ChartFormat | null): string {
  if (value == null || Number.isNaN(value)) {
    return ''
  }
  const resolved = format ?? props.spec.format
  if (resolved === 'money') {
    return formatMoney(value, props.spec.currency, locale.value)
  }
  if (resolved === 'percent') {
    return `${value}%`
  }
  if (resolved === 'area_m2') {
    return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value)} m²`
  }
  const digits = resolved === 'int' ? 0 : 1
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: digits }).format(value)
}

function primaryColor(): string {
  if (!import.meta.client) {
    return '#3b82f6'
  }
  const styles = getComputedStyle(document.documentElement)
  const raw = styles.getPropertyValue('--ui-primary').trim()
    || styles.getPropertyValue('--ui-color-primary-500').trim()
  return raw || '#3b82f6'
}

const labels = computed(() => props.spec.categories.map(categoryLabel))

const apexType = computed(() => {
  switch (props.spec.type) {
    case 'column':
    case 'stacked_column':
    case 'bar':
    case 'funnel':
      return 'bar'
    case 'stacked_area':
      return 'area'
    case 'combo':
      return 'line'
    default:
      return props.spec.type
  }
})

const apexSeries = computed(() => {
  if (props.spec.type === 'donut') {
    return (props.spec.series[0]?.data ?? []).map(value => value ?? 0)
  }
  if (props.spec.type === 'heatmap') {
    return props.spec.series.map(series => ({
      name: seriesName(series),
      data: props.spec.categories.map((category, index) => ({
        x: categoryLabel(category),
        y: series.data[index] ?? null
      }))
    }))
  }
  return props.spec.series.map(series => ({
    name: seriesName(series),
    data: series.data,
    type: series.kind === 'column'
      ? 'column'
      : series.kind === 'area'
        ? 'area'
        : series.kind === 'line'
          ? 'line'
          : undefined
  }))
})

const options = computed(() => {
  const primary = primaryColor()
  const stacked = props.spec.type === 'stacked_column' || props.spec.type === 'stacked_area'
  const horizontal = props.spec.type === 'bar' || props.spec.type === 'funnel'
  const hasSecondary = props.spec.series.some(series => series.axis === 1)
  const mode = colorMode.value === 'dark' ? 'dark' : 'light'

  const yaxis = hasSecondary
    ? [
        {
          seriesName: seriesName(props.spec.series.find(series => series.axis === 0) ?? props.spec.series[0]!),
          labels: {
            formatter: (value: number) => formatValue(value, props.spec.format)
          }
        },
        {
          opposite: true,
          seriesName: seriesName(props.spec.series.find(series => series.axis === 1) ?? props.spec.series[0]!),
          labels: {
            formatter: (value: number) => formatValue(value, props.spec.secondary_format)
          }
        }
      ]
    : {
        labels: {
          formatter: (value: number) => formatValue(value, props.spec.format)
        }
      }

  return {
    chart: {
      type: apexType.value,
      stacked,
      stackType: props.spec.percent_stacked ? '100%' : 'normal',
      background: 'transparent',
      toolbar: { show: false },
      fontFamily: 'inherit'
    },
    theme: { mode },
    colors: [primary, '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'],
    labels: props.spec.type === 'donut' ? labels.value : undefined,
    xaxis: props.spec.type === 'donut'
      ? undefined
      : {
          categories: labels.value,
          labels: { style: { colors: undefined } }
        },
    yaxis: props.spec.type === 'donut' || props.spec.type === 'heatmap' ? undefined : yaxis,
    plotOptions: {
      bar: {
        horizontal,
        isFunnel: props.spec.type === 'funnel'
      },
      heatmap: {
        colorScale: {
          ranges: [
            { from: 0, to: 25, color: '#dbeafe', name: '0–25' },
            { from: 25, to: 50, color: '#93c5fd', name: '25–50' },
            { from: 50, to: 75, color: '#3b82f6', name: '50–75' },
            { from: 75, to: 100, color: '#1d4ed8', name: '75–100' }
          ]
        }
      }
    },
    dataLabels: {
      enabled: props.spec.type === 'donut' || props.spec.type === 'funnel',
      formatter: (value: number) => formatValue(value, props.spec.format)
    },
    tooltip: {
      y: {
        formatter: (value: number, opts?: { seriesIndex?: number }) => {
          const index = opts?.seriesIndex ?? 0
          const axis = props.spec.series[index]?.axis ?? 0
          const format = axis === 1 ? props.spec.secondary_format : props.spec.format
          return formatValue(value, format)
        }
      }
    },
    annotations: {
      yaxis: props.spec.targets.map(target => ({
        y: target.y,
        borderColor: primary,
        label: {
          text: t(target.label_key),
          style: { background: primary, color: '#fff' }
        }
      }))
    },
    stroke: {
      width: props.spec.type === 'combo' ? [0, 3] : 2,
      curve: 'smooth'
    },
    legend: { position: 'bottom' },
    grid: { borderColor: 'rgba(128,128,128,0.25)' }
  }
})
</script>

<template>
  <div>
    <p class="font-medium">
      {{ t(spec.title_key) }}
    </p>
    <p
      v-if="spec.description_key"
      class="text-muted mb-3 text-sm"
    >
      {{ t(spec.description_key) }}
    </p>
    <p
      v-if="spec.empty"
      class="text-muted py-10 text-center text-sm"
    >
      {{ t('insights.charts.empty') }}
    </p>
    <apexchart
      v-else
      :type="apexType"
      :height="chartHeight"
      :options="options"
      :series="apexSeries"
    />
  </div>
</template>
