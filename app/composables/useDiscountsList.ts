import type { ApiDiscount } from '~/types/facility'

function matchesSearch(discount: ApiDiscount, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    discount.label,
    discount.code ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function formatDiscountValue(discount: ApiDiscount) {
  if (discount.discount_type === 'percentage') {
    return `${discount.value}%`
  }

  return discount.value
}

export function formatDiscountDuration(discount: ApiDiscount, t: (key: string, params?: Record<string, unknown>) => string) {
  if (discount.duration_months == null) {
    return t('pages.discounts.durationForever')
  }

  return t('pages.discounts.durationMonths', { count: discount.duration_months })
}

export function useDiscountsList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'discounts',
    () => getPaginated<ApiDiscount>('/api/discounts', { page: page.value, per_page: perPage.value }),
    { watch: [page, perPage] }
  )

  const paginatedDiscounts = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(discount => matchesSearch(discount, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedDiscounts.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch(searchQuery, () => {
    resetPage()
  })

  return {
    searchQuery,
    paginatedDiscounts,
    totalCount,
    showingCount,
    page,
    perPage,
    perPageOptions,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}
