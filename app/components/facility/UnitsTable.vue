<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiUnit } from '~/types/facility'
import { formatUnitDimensions } from '~/composables/useUnitsList'

defineProps<{
  units: ApiUnit[]
}>()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')

const columns = computed<TableColumn<ApiUnit>[]>(() => [
  {
    accessorKey: 'unit_number',
    header: t('table.unit'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.unit_number)
  },
  {
    id: 'dimensions',
    header: t('table.dimensions'),
    cell: ({ row }) => formatUnitDimensions(row.original)
  },
  {
    accessorKey: 'site_id',
    header: t('table.site'),
    cell: ({ row }) => row.original.site_id
  },
  {
    accessorKey: 'unit_class_id',
    header: t('table.class'),
    cell: ({ row }) => row.original.unit_class_id
  },
  {
    accessorKey: 'enabled',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.enabled ? t('status.enabled') : t('status.disabled'),
      color: row.original.enabled ? 'success' : 'neutral',
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'note',
    header: t('table.note'),
    cell: ({ row }) => row.original.note ?? t('common.emptyValue')
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
])
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
