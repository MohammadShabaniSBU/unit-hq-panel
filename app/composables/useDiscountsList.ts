import type { ApiDiscount, DiscountKind, DiscountListStatus } from '~/types/facility'

function matchesSearch(discount: ApiDiscount, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return discount.name.toLowerCase().includes(normalized)
}

export function formatDiscountSummary(
  discount: ApiDiscount,
  t: (key: string, params?: Record<string, unknown>) => string
) {
  if (discount.kind === 'percent') {
    const percent = 'percent' in discount.params ? discount.params.percent : ''
    return t('settings.discounts.summaryPercent', { percent })
  }

  const tiers = 'tiers' in discount.params ? discount.params.tiers : []
  const maxFree = tiers.reduce((max, tier) => Math.max(max, tier.free_weeks), 0)

  return t('settings.discounts.summaryFreeTime', {
    count: tiers.length,
    weeks: maxFree
  })
}

export function formatDiscountKind(
  kind: DiscountKind,
  t: (key: string, params?: Record<string, unknown>) => string
) {
  return kind === 'percent'
    ? t('settings.discounts.kindPercent')
    : t('settings.discounts.kindFreeTime')
}

export function useDiscountsList() {
  const { get, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()

  const searchQuery = ref('')
  const statusFilter = ref<DiscountListStatus>('active')
  const discounts = ref<Array<ApiDiscount>>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const filteredDiscounts = computed(() =>
    discounts.value.filter(discount => matchesSearch(discount, searchQuery.value))
  )

  async function refresh() {
    pending.value = true
    error.value = null

    try {
      const response = await get<Array<ApiDiscount>>('/api/discounts', {
        status: statusFilter.value
      })
      discounts.value = response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? t('settings.discounts.loadError')
    } finally {
      pending.value = false
    }
  }

  async function archiveDiscount(discount: ApiDiscount) {
    try {
      await post<ApiDiscount>(`/api/discounts/${discount.id}/archive`, {})
      toast.add({
        title: t('settings.discounts.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
      const fieldMessage = fetchError.data?.errors?.discount?.[0]
      toast.add({
        title: fieldMessage ?? fetchError.data?.message ?? t('settings.discounts.archiveError'),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveDiscount(discount: ApiDiscount) {
    try {
      await post<ApiDiscount>(`/api/discounts/${discount.id}/unarchive`, {})
      toast.add({
        title: t('settings.discounts.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('settings.discounts.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  watch(statusFilter, () => {
    refresh()
  })

  return {
    searchQuery,
    statusFilter,
    discounts: filteredDiscounts,
    pending,
    error,
    refresh,
    archiveDiscount,
    unarchiveDiscount
  }
}
