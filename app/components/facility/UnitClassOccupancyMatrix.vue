<script setup lang="ts">
import type { ApiUnitClassOccupancyMatrixRow, ApiUnitClassPriceMatrixSite } from '~/types/facility'
import type { OccupancyCounts } from '~/utils/occupancyBands'
import { ALL_SITES_HEADER_CLASS, emptyCounts } from '~/utils/occupancyBands'
import UnitClassOccupancyCell from '~/components/facility/UnitClassOccupancyCell.vue'
import UnitClassOccupancyLegend from '~/components/facility/UnitClassOccupancyLegend.vue'

const props = defineProps<{
  sites: Array<ApiUnitClassPriceMatrixSite>
  rows: Array<ApiUnitClassOccupancyMatrixRow>
  showAllSitesColumn: boolean
  rowTotals: Record<number, OccupancyCounts>
  siteTotals: Record<number, OccupancyCounts>
  grandTotal: OccupancyCounts
}>()

const { t } = useI18n()

const columnCount = computed(() => {
  const gap = props.showAllSitesColumn ? 1 : 0
  const total = props.showAllSitesColumn ? 1 : 0
  return 1 + props.sites.length + gap + total
})

function cellCounts(row: ApiUnitClassOccupancyMatrixRow, siteId: number): OccupancyCounts {
  return row.occupancy[String(siteId)] ?? emptyCounts()
}

function rowTotal(unitClassId: number): OccupancyCounts {
  return props.rowTotals[unitClassId] ?? emptyCounts()
}

function siteTotal(siteId: number): OccupancyCounts {
  return props.siteTotals[siteId] ?? emptyCounts()
}
</script>

<template>
  <div>
    <div class="overflow-auto rounded-lg border border-default">
      <table class="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              class="sticky left-0 top-0 z-30 bg-default px-3 py-2 text-left text-xs font-medium tracking-wide text-muted uppercase"
            >
              {{ t('table.code') }}
            </th>
            <th
              v-for="site in sites"
              :key="site.id"
              scope="col"
              class="sticky top-0 z-20 bg-default px-3 py-2 text-center text-xs font-medium tracking-wide text-muted uppercase"
            >
              {{ site.name }}
            </th>
            <th
              v-if="showAllSitesColumn"
              aria-hidden="true"
              class="sticky top-0 z-20 w-2 bg-default p-0"
            />
            <th
              v-if="showAllSitesColumn"
              scope="col"
              class="sticky top-0 z-20 px-3 py-2 text-center text-xs font-semibold tracking-wide uppercase"
              :class="ALL_SITES_HEADER_CLASS"
            >
              {{ t('pages.unitClasses.matrix.allSites') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.unit_class_id"
          >
            <th
              scope="row"
              class="sticky left-0 z-10 bg-default px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-highlighted"
            >
              {{ row.code }}
            </th>
            <UnitClassOccupancyCell
              v-for="site in sites"
              :key="site.id"
              :site-name="site.name"
              :class-code="row.code"
              :counts="cellCounts(row, site.id)"
              variant="data"
            />
            <td
              v-if="showAllSitesColumn"
              aria-hidden="true"
              class="w-2 p-0"
            />
            <UnitClassOccupancyCell
              v-if="showAllSitesColumn"
              :site-name="t('pages.unitClasses.matrix.allSites')"
              :class-code="row.code"
              :counts="rowTotal(row.unit_class_id)"
              variant="total"
            />
          </tr>
          <tr aria-hidden="true">
            <td
              :colspan="columnCount"
              class="h-2 border-0 p-0"
            />
          </tr>
          <tr>
            <th
              scope="row"
              class="sticky left-0 z-10 bg-default px-3 py-2 text-left text-sm font-semibold whitespace-nowrap text-highlighted"
            >
              {{ t('pages.unitClasses.matrix.allClasses') }}
            </th>
            <UnitClassOccupancyCell
              v-for="site in sites"
              :key="`total-${site.id}`"
              :site-name="site.name"
              :class-code="t('pages.unitClasses.matrix.allClasses')"
              :counts="siteTotal(site.id)"
              variant="summary"
            />
            <td
              v-if="showAllSitesColumn"
              aria-hidden="true"
              class="w-2 p-0"
            />
            <UnitClassOccupancyCell
              v-if="showAllSitesColumn"
              :site-name="t('pages.unitClasses.matrix.allSites')"
              :class-code="t('pages.unitClasses.matrix.allClasses')"
              :counts="grandTotal"
              variant="corner"
            />
          </tr>
        </tbody>
      </table>
    </div>

    <UnitClassOccupancyLegend class="mt-3" />
  </div>
</template>
