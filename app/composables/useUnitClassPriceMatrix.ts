import type { ApiUnitClassPriceMatrix, ApiUnitClassPriceMatrixCell, ApiUnitClassPriceMatrixRow } from '~/types/facility'
import type { Ref } from 'vue'

function billingPeriodLabel(period: string, t: (key: string) => string) {
  switch (period) {
    case 'monthly':
      return t('forms.settings.billingPeriodMonthly')
    case 'weekly':
      return t('forms.settings.billingPeriodWeekly')
    case 'annual':
      return t('forms.settings.billingPeriodAnnual')
    default:
      return period
  }
}

export function formatCurrencyAmount(amount: string | number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export function formatUnitClassPriceCell(
  price: ApiUnitClassPriceMatrixCell | null | undefined,
  t: (key: string) => string,
  emptyValue: string
) {
  if (!price?.amount) {
    return emptyValue
  }

  const period = billingPeriodLabel(price.billing_period, t)

  return `${formatCurrencyAmount(price.amount, price.currency)} / ${period}`
}

function matchesSearch(row: ApiUnitClassPriceMatrixRow, query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  return [
    row.code,
    row.label
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useUnitClassPriceMatrix(searchQuery: Ref<string>) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'unit-class-price-matrix',
    () => get<ApiUnitClassPriceMatrix>('/api/unit-class-price-matrix')
  )

  const sites = computed(() => data.value?.data.sites ?? [])
  const rows = computed(() => data.value?.data.rows ?? [])

  const filteredRows = computed(() => {
    return rows.value.filter(row => matchesSearch(row, searchQuery.value))
  })

  return {
    sites,
    rows,
    filteredRows,
    pending,
    error,
    refresh
  }
}
