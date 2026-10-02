import type { ApiUnitClassOccupancyMatrix, ApiUnitClassOccupancyMatrixCell, ApiUnitClassOccupancyMatrixRow } from '~/types/facility'
import type { Ref } from 'vue'
import { emptyCounts, sumCounts, type OccupancyCounts } from '~/utils/occupancyBands'

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

function cellsFor(row: ApiUnitClassOccupancyMatrixRow, siteIds: Array<number>): Array<ApiUnitClassOccupancyMatrixCell> {
  return siteIds.flatMap((siteId) => {
    const cell = row.occupancy[String(siteId)]
    return cell ? [cell] : []
  })
}

export function useUnitClassOccupancyMatrix(searchQuery: Ref<string>) {
  const { get } = useApi()
  const { portalSiteId, portalSiteQuery } = usePortalSiteQuery()

  const { data, pending, error, refresh } = useAsyncData(
    'unit-class-occupancy-matrix',
    () => get<ApiUnitClassOccupancyMatrix>(
      '/api/unit-class-occupancy-matrix',
      portalSiteQuery.value
    ),
    { watch: [portalSiteId] }
  )

  const sites = computed(() => data.value?.data.sites ?? [])
  const rows = computed(() => data.value?.data.rows ?? [])

  const filteredRows = computed(() => {
    return rows.value.filter(row => matchesSearch(row, searchQuery.value))
  })

  const siteIds = computed(() => sites.value.map(site => site.id))

  const showAllSitesColumn = computed(() => sites.value.length > 1)

  const rowTotals = computed(() => {
    const totals: Record<number, OccupancyCounts> = {}

    for (const row of filteredRows.value) {
      totals[row.unit_class_id] = sumCounts(cellsFor(row, siteIds.value))
    }

    return totals
  })

  const siteTotals = computed(() => {
    const totals: Record<number, OccupancyCounts> = {}

    for (const siteId of siteIds.value) {
      const cells = filteredRows.value.flatMap((row) => {
        const cell = row.occupancy[String(siteId)]
        return cell ? [cell] : []
      })
      totals[siteId] = sumCounts(cells)
    }

    return totals
  })

  const grandTotal = computed(() => {
    return sumCounts(filteredRows.value.flatMap(row => cellsFor(row, siteIds.value)))
  })

  return {
    sites,
    rows,
    filteredRows,
    showAllSitesColumn,
    rowTotals,
    siteTotals,
    grandTotal,
    emptyCounts,
    pending,
    error,
    refresh
  }
}
