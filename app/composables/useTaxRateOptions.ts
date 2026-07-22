import type { ApiTaxRateOption } from '~/types/tax-rate'

export function useTaxRateOptions() {
  const { get } = useApi()

  const { data, pending, error } = useAsyncData(
    'options:/api/tax-rates/options',
    () => get<Array<ApiTaxRateOption>>('/api/tax-rates/options')
  )

  const items = computed(() => data.value?.data ?? [])

  return { items, pending, error }
}
