<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { UnitClass } from '~/types/facility'
import {
  formatOccupancyCount,
  formatPriceRange,
  formatSizeRange,
  occupancyPercent
} from '~/composables/useUnitClassesList'
import { occupancyBarColor } from '~/composables/useSitesList'

defineProps<{
  unitClasses: UnitClass[]
}>()

const UIcon = resolveComponent('UIcon')

const columns: TableColumn<UnitClass>[] = [
  {
    accessorKey: 'name',
    header: 'Class',
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    id: 'size',
    header: 'Size',
    cell: ({ row }) => formatSizeRange(row.original.minM2, row.original.maxM2)
  },
  {
    id: 'units',
    header: 'Units',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums'
      }
    },
    cell: ({ row }) => formatOccupancyCount(row.original.occupiedUnits, row.original.totalUnits)
  },
  {
    id: 'occupancy',
    header: 'Occupancy',
    cell: ({ row }) => {
      const percent = occupancyPercent(row.original.occupiedUnits, row.original.totalUnits)
      return h('div', { class: 'flex min-w-[120px] items-center gap-3' }, [
        h('div', { class: 'h-1.5 flex-1 overflow-hidden rounded-full bg-elevated' }, [
          h('div', {
            class: `h-full rounded-full ${occupancyBarColor(percent)}`,
            style: { width: `${percent}%` }
          })
        ]),
        h('span', { class: 'w-8 text-right text-sm tabular-nums text-highlighted' }, `${percent}%`)
      ])
    }
  },
  {
    id: 'price',
    header: 'Price',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums font-medium'
      }
    },
    cell: ({ row }) => formatPriceRange(row.original.minPrice, row.original.maxPrice)
  },
  {
    accessorKey: 'billingLabel',
    header: 'Billing',
    cell: ({ row }) => row.original.billingLabel
  },
  {
    id: 'features',
    header: 'Features',
    cell: ({ row }) => h('div', { class: 'flex flex-wrap gap-1' },
      row.original.features.map(feature =>
        h('span', {
          class: 'rounded-full bg-elevated px-2 py-0.5 text-xs text-muted'
        }, feature)
      )
    )
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: () => h(UIcon, {
      name: 'i-lucide-chevron-right',
      class: 'size-4 text-dimmed'
    })
  }
]
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <UTable
      :data="unitClasses"
      :columns="columns"
      :ui="{
        thead: '[&>tr]:border-b [&>tr]:border-default',
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-wide text-dimmed',
        td: 'px-4 py-4 text-sm text-muted',
        tr: 'border-b border-default last:border-b-0 hover:bg-elevated/50 transition-colors cursor-pointer'
      }"
    />
  </div>
</template>
