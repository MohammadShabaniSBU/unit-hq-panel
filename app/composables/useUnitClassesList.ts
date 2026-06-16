import type { UnitClass } from '~/types/facility'
import { mockUnitClasses } from '~/data/unit-classes.mock'

const PAGE_SIZE = 10

function matchesSearch(unitClass: UnitClass, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    unitClass.name,
    unitClass.billingLabel,
    ...unitClass.features
  ].some(value => value.toLowerCase().includes(normalized))
}

export function useUnitClassesList() {
  const searchQuery = ref('')
  const page = ref(1)

  const filteredUnitClasses = computed(() =>
    mockUnitClasses.filter(unitClass => matchesSearch(unitClass, searchQuery.value))
  )

  const totalCount = computed(() => filteredUnitClasses.value.length)

  const pageCount = computed(() => Math.max(1, Math.ceil(filteredUnitClasses.value.length / PAGE_SIZE)))

  const paginatedUnitClasses = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredUnitClasses.value.slice(start, start + PAGE_SIZE)
  })

  const showingCount = computed(() => paginatedUnitClasses.value.length)

  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < pageCount.value)

  watch(searchQuery, () => {
    page.value = 1
  })

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
    paginatedUnitClasses,
    totalCount,
    showingCount,
    canGoPrev,
    canGoNext,
    goToPrevPage,
    goToNextPage
  }
}

export function formatSizeRange(minM2: number, maxM2: number) {
  return `${minM2}–${maxM2} m²`
}

export function formatPriceRange(minPrice: number, maxPrice: number) {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  })

  return `${formatter.format(minPrice)} – ${formatter.format(maxPrice)}`
}

export function formatOccupancyCount(occupied: number, total: number) {
  return `${occupied} / ${total}`
}

export function occupancyPercent(occupied: number, total: number) {
  if (total === 0) {
    return 0
  }

  return Math.round((occupied / total) * 100)
}
