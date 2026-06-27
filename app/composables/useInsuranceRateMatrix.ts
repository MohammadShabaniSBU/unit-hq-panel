import type { ApiInsuranceRateMatrix, ApiInsuranceRateMatrixCell, ApiInsuranceRateMatrixRow } from '~/types/facility'
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

export function formatInsuranceRateCell(
  rate: ApiInsuranceRateMatrixCell | null | undefined,
  t: (key: string) => string,
  emptyValue: string
) {
  if (!rate?.amount) {
    return emptyValue
  }

  const period = billingPeriodLabel(rate.billing_period, t)

  return `${rate.amount} ${rate.currency} / ${period}`
}

function matchesSearch(row: ApiInsuranceRateMatrixRow, query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  return row.name.toLowerCase().includes(normalized)
}

export function useInsuranceRateMatrix(searchQuery: Ref<string>) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'insurance-rate-matrix',
    () => get<ApiInsuranceRateMatrix>('/api/insurance-rate-matrix')
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
