import type { ApiUnitClassOccupancyMatrix, ApiUnitClassOccupancyMatrixRow } from '~/types/facility'
import type { Ref } from 'vue'

function matchesSearch(row: ApiUnitClassOccupancyMatrixRow, query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  return [
    row.code,
    row.label
  ].some(value => value.toLowerCase().includes(normalized))
}

export function occupancyBgColor(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) {
    return 'transparent'
  }

  const hue = Math.round(120 - percentage * 1.2)
  return `hsla(${hue}, 70%, 50%, 0.15)`
}

export function useUnitClassOccupancyMatrix(searchQuery: Ref<string>) {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'unit-class-occupancy-matrix',
    () => get<ApiUnitClassOccupancyMatrix>('/api/unit-class-occupancy-matrix')
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
