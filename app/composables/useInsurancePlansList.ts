import type { ApiInsurancePlan } from '~/types/facility'

function matchesSearch(plan: ApiInsurancePlan, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    plan.name,
    plan.description ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useInsurancePlansList() {
  const { getPaginated } = useApi()
  const searchQuery = ref('')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'insurance-plans',
    () => getPaginated<ApiInsurancePlan>('/api/insurances', { page: page.value, per_page: perPage.value }),
    { watch: [page, perPage] }
  )

  const paginatedPlans = computed(() => {
    const items = data.value?.data ?? []
    return items.filter(plan => matchesSearch(plan, searchQuery.value))
  })

  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedPlans.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch(searchQuery, () => {
    resetPage()
  })

  return {
    searchQuery,
    paginatedPlans,
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

export function formatInsuranceCoverage(plan: ApiInsurancePlan) {
  if (!plan.coverage) {
    return '—'
  }

  return `${plan.coverage} ${plan.currency}`
}
