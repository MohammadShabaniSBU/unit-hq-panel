<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiUnit } from '~/types/facility'
import { formatUnitClass, formatUnitDimensions, formatUnitSite } from '~/composables/useUnitsList'

const formUnit = ref<ApiUnit | null>(null)
const showForm = ref(false)

const {
  searchQuery,
  paginatedUnits,
  totalCount,
  showingCount,
  perPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage
} = useUnitsList()

const { t } = useI18n()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  formUnit.value = null
  showForm.value = true
}

function openEdit(unit: ApiUnit) {
  formUnit.value = unit
  showForm.value = true
}

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
    cell: ({ row }) => formatUnitSite(row.original)
  },
  {
    accessorKey: 'unit_class_id',
    header: t('table.class'),
    cell: ({ row }) => formatUnitClass(row.original)
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
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[{
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() {
          openEdit(row.original)
        }
      }]],
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        icon: 'i-lucide-ellipsis',
        color: 'neutral',
        variant: 'ghost',
        size: 'sm',
        square: true,
        'aria-label': t('common.actions')
      })
    })
  }
])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ $t('pages.units.title') }}
          </h1>
        </div>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.units.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.units.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.units.addUnit')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.units.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <template v-else>
      <div class="mt-6 overflow-x-auto rounded-lg border border-default">
        <UTable
          :data="paginatedUnits"
          :columns="columns"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
      />
    </template>

    <FacilityUnitFormSlideover
      v-model:open="showForm"
      v-model:unit="formUnit"
      @saved="refresh()"
    />
  </UContainer>
</template>
