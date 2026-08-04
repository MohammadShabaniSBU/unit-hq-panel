import type { DiscountKind } from '~/types/facility'
import type { ApiDiscountResolution } from '~/types/discount'

export interface ApiDiscountOption {
  value: number
  label: string
  kind: DiscountKind
}

export function useDiscountOptions() {
  const { get } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    'options:/api/discounts/options',
    () => get<Array<ApiDiscountOption>>('/api/discounts/options')
  )

  const items = computed(() => data.value?.data ?? [])

  const selectItems = computed(() => [
    { value: null as number | null, label: t('discounts.none'), kind: null as DiscountKind | null },
    ...items.value.map(item => ({
      value: item.value as number | null,
      label: item.label,
      kind: item.kind as DiscountKind | null
    }))
  ])

  return { items, selectItems, pending, error, refresh }
}

export function useDiscountResolve() {
  const { get } = useApi()

  async function resolveDiscount(params: {
    discountId: number
    dealId?: number | null
    commitmentWeeks?: number | null
    listAmount?: string | null
    currency?: string | null
    locale?: string | null
    anchorDate?: string | null
  }): Promise<ApiDiscountResolution | null> {
    const query: Record<string, string | number> = {}
    if (params.dealId != null) query.deal_id = params.dealId
    if (params.commitmentWeeks != null) query.commitment_weeks = params.commitmentWeeks
    if (params.listAmount) query.list_amount = params.listAmount
    if (params.currency) query.currency = params.currency
    if (params.locale) query.locale = params.locale
    if (params.anchorDate) query.anchor_date = params.anchorDate

    try {
      const response = await get<ApiDiscountResolution>(
        `/api/discounts/${params.discountId}/resolve`,
        query
      )
      return response.data
    } catch {
      return null
    }
  }

  return { resolveDiscount }
}

/** Convert length × period to whole weeks (matches API CommitmentWeeks). */
export function commitmentToWeeks(length: number, period: 'week' | 'month'): number {
  if (length < 1) return 0
  return period === 'month' ? length * 4 : length
}
