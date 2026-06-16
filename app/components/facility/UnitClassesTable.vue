<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiUnitClass } from '~/types/facility'
import { formatUnitClassSize } from '~/composables/useUnitClassesList'

defineProps<{
  unitClasses: ApiUnitClass[]
}>()

const { t } = useI18n()

const UIcon = resolveComponent('UIcon')

const columns = computed<TableColumn<ApiUnitClass>[]>(() => [
  {
    accessorKey: 'code',
    header: t('table.code'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.code)
  },
  {
    accessorKey: 'label',
    header: t('table.label')
  },
  {
    id: 'size',
    header: t('table.size'),
    cell: ({ row }) => formatUnitClassSize(row.original.size)
  },
  {
    accessorKey: 'current_price_id',
    header: t('table.priceId'),
    meta: {
      class: {
        th: 'text-right',
        td: 'text-right tabular-nums'
      }
    },
    cell: ({ row }) => row.original.current_price_id ?? t('common.emptyValue')
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
