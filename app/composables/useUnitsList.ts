import type { Unit, UnitStatusFilter } from '~/types/facility'
import { mockUnits, unitTabCounts } from '~/data/units.mock'

const PAGE_SIZE = 10

function matchesSearch(unit: Unit, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    unit.name,
    unit.type,
    unit.tenantName ?? '',
    unit.floor
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useUnitsList() {
  const searchQuery = ref('')
  const statusFilter = ref<UnitStatusFilter>('all')
  const page = ref(1)

  const filteredUnits = computed(() => {
    let results = mockUnits.filter(unit => matchesSearch(unit, searchQuery.value))

    if (statusFilter.value !== 'all') {
      results = results.filter(unit => unit.status === statusFilter.value)
    }

    return results
  })

  const totalCount = computed(() => {
    const hasFilters = searchQuery.value.trim() !== '' || statusFilter.value !== 'all'
    if (!hasFilters) {
      return unitTabCounts.all
    }

    return filteredUnits.value.length
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(filteredUnits.value.length / PAGE_SIZE)))

  const paginatedUnits = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredUnits.value.slice(start, start + PAGE_SIZE)
  })

  const showingCount = computed(() => paginatedUnits.value.length)

  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < pageCount.value)

  watch([searchQuery, statusFilter], () => {
    page.value = 1
  })

  function setStatusFilter(filter: UnitStatusFilter) {
    statusFilter.value = filter
  }

  function goToPrevPage() {
    if (canGoPrev.value) {
      page.value -= 1
    }
  }

  function goToNextPage() {
    if (canGoNext.value) {
      page.value += 1
    }
  }

  return {
    searchQuery,
    statusFilter,
    tabCounts: unitTabCounts,
    paginatedUnits,
    totalCount,
    showingCount,
    canGoPrev,
    canGoNext,
    setStatusFilter,
    goToPrevPage,
    goToNextPage
  }
}

export function formatUnitRent(amount?: number) {
  if (amount === undefined) {
    return '—'
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatMoveInDate(isoDate?: string) {
  if (!isoDate) {
    return '—'
  }

  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  })
}

export const unitStatusLabels = {
  occupied: 'Occupied',
  vacant: 'Vacant',
  reserved: 'Reserved',
  maintenance: 'Maintenance'
} as const

export const unitStatusColors = {
  occupied: 'success',
  vacant: 'neutral',
  reserved: 'warning',
  maintenance: 'error'
} as const

export const unitStatusDotColors = {
  occupied: 'bg-success',
  vacant: 'bg-neutral-400',
  reserved: 'bg-warning',
  maintenance: 'bg-error'
} as const
