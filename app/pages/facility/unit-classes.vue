<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiUnitClass, ApiUnitClassPriceMatrixRow } from '~/types/facility'
import { formatUnitClassSize } from '~/composables/useUnitClassesList'

type UnitClassView = 'list' | 'matrix'

const formUnitClass = ref<ApiUnitClass | null>(null)
const showForm = ref(false)
const pricesUnitClass = ref<ApiUnitClass | null>(null)
const showPrices = ref(false)
const activeView = ref<UnitClassView>('list')

const {
  searchQuery,
  paginatedUnitClasses,
  totalCount,
  showingCount,
  perPage,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useUnitClassesList()

const {
  sites: matrixSites,
  filteredRows: matrixRows,
  pending: matrixPending,
  error: matrixError,
  refresh: refreshMatrix
} = useUnitClassPriceMatrix(searchQuery)

const { t } = useI18n()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const isListView = computed(() => activeView.value === 'list')
const isLoading = computed(() => isListView.value ? pending.value : matrixPending.value)
const loadError = computed(() => isListView.value ? error.value : matrixError.value)

function openCreate() {
  formUnitClass.value = null
  showForm.value = true
}

function openEdit(unitClass: ApiUnitClass) {
  formUnitClass.value = unitClass
  showForm.value = true
}

function openPrices(unitClass: ApiUnitClass) {
  pricesUnitClass.value = unitClass
  showPrices.value = true
}

function refreshCurrentView() {
  if (isListView.value) {
    refresh()
    return
  }

  refreshMatrix()
}

function onSaved() {
  refresh()
  refreshMatrix()
}

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
      items: [[
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        },
        {
          label: t('common.prices'),
          icon: 'i-lucide-tag',
          onSelect() {
            openPrices(row.original)
          }
        }
      ]],
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

const matrixColumns = computed<TableColumn<ApiUnitClassPriceMatrixRow>[]>(() => [
  {
    accessorKey: 'code',
    header: t('table.code'),
    meta: {
      class: {
        th: 'sticky left-0 z-10 bg-default',
        td: 'sticky left-0 z-10 bg-default'
      }
    },
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.code)
  },
  ...matrixSites.value.map(site => ({
    id: `site-${site.id}`,
    header: site.name,
    meta: {
      class: {
        th: 'text-right whitespace-nowrap',
        td: 'text-right tabular-nums whitespace-nowrap'
      }
    },
    cell: ({ row }: { row: { original: ApiUnitClassPriceMatrixRow } }) =>
      formatUnitClassPriceCell(
        row.original.prices[String(site.id)],
        t,
        t('common.emptyValue')
      )
  }))
])
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ $t('pages.unitClasses.title') }}
          </h1>
        </div>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.unitClasses.subtitle') }}
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="flex items-center rounded-lg border border-default p-0.5">
          <UButton
            icon="i-lucide-rows-3"
            :color="activeView === 'list' ? 'primary' : 'neutral'"
            :variant="activeView === 'list' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.unitClasses.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-table"
            :color="activeView === 'matrix' ? 'primary' : 'neutral'"
            :variant="activeView === 'matrix' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.unitClasses.viewMatrix')"
            @click="activeView = 'matrix'"
          />
        </div>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.unitClasses.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.unitClasses.newClass')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="isLoading"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="loadError"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('pages.unitClasses.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refreshCurrentView()"
      />
    </div>

    <template v-else>
      <div
        v-if="isListView"
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 280px)"
      >
        <UTable
          :data="paginatedUnitClasses"
          :columns="columns"
        />
      </div>

      <div
        v-else
        class="mt-6 overflow-hidden rounded-lg border border-default"
        style="height: calc(100vh - 280px)"
      >
        <UTable
          :data="matrixRows"
          :columns="matrixColumns"
        />
      </div>

      <FacilityListPagination
        v-if="isListView"
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="totalCount"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>

    <FacilityUnitClassFormSlideover
      v-model:open="showForm"
      v-model:unit-class="formUnitClass"
      @saved="onSaved()"
    />

    <FacilityUnitClassPricesSlideover
      v-model:open="showPrices"
      v-model:unit-class="pricesUnitClass"
      @saved="onSaved()"
    />
  </UContainer>
</template>
