import type { ApiUnitClassPriceMatrix, ApiUnitClassPriceMatrixCell, ApiUnitClassPriceMatrixRow } from '~/types/facility'
import type { Ref } from 'vue'
import { formatMoney } from '~/composables/useMoney'

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

/** @deprecated Use `formatMoney` from `~/composables/useMoney`. */
export function formatCurrencyAmount(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
  locale?: string
): string {
  return formatMoney(amount, currency, locale)
}

export function formatUnitClassPriceCell(
  price: ApiUnitClassPriceMatrixCell | null | undefined,
  t: (key: string) => string,
  emptyValue: string
) {
  if (!price?.amount) {
    return emptyValue
  }

  const formatted = formatMoney(price.amount, price.currency)

  if (!price.billing_period) {
    return formatted
  }

  return `${formatted} / ${billingPeriodLabel(price.billing_period, t)}`
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
