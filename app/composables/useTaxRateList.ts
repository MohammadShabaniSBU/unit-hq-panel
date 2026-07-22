import type { ApiTaxRate } from '~/types/tax-rate'

function matchesSearch(taxRate: ApiTaxRate, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [taxRate.name, taxRate.code].some(value => value.toLowerCase().includes(normalized))
}

export function useTaxRateList() {
  const { get } = useApi()
  const searchQuery = ref('')
  const historyCode = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    'tax-rates',
    () => get<Array<ApiTaxRate>>('/api/tax-rates', historyCode.value ? { code: historyCode.value } : undefined),
    { watch: [historyCode] }
  )

  const taxRates = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(taxRate => matchesSearch(taxRate, searchQuery.value))
  })

  function viewHistory(code: string) {
    historyCode.value = code
  }

  function exitHistory() {
    historyCode.value = null
  }

  return {
    searchQuery,
    taxRates,
    historyCode,
    pending,
    error,
    refresh,
    viewHistory,
    exitHistory
  }
}
