<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Unit } from '~/types/facility'
import {
  formatMoveInDate,
  formatUnitRent
} from '~/composables/useUnitsList'

defineProps<{
  units: Unit[]
}>()

const UnitStatusBadge = resolveComponent('FacilityUnitStatusBadge')
const UIcon = resolveComponent('UIcon')

const columns: TableColumn<Unit>[] = [
  {
    accessorKey: 'name',
    header: 'Unit',
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.name)
  },
  {
    accessorKey: 'floor',
    header: 'Floor'
  },
  {
    accessorKey: 'sizeM2',
    header: 'Size',
    cell: ({ row }) => `${row.original.sizeM2} m²`
  },
  {
    accessorKey: 'type',
    header: 'Type'
  },
  {
    accessorKey: 'tenantName',
    header: 'Tenant',
    cell: ({ row }) => row.original.tenantName ?? '—'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UnitStatusBadge, { status: row.original.status })
  },
  {
    id: 'moveIn',
    header: 'Move in',
    cell: ({ row }) => formatMoveInDate(row.original.moveInDate)
  },
  {
    accessorKey: 'rentPerMonth',
    header: 'Rent',
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums font-medium'
      }
    },
    cell: ({ row }) => formatUnitRent(row.original.rentPerMonth)
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
      :data="units"
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
