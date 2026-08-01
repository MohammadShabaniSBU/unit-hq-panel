<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiUnit } from '~/types/facility'
import type { UnitState, UnitStateFilter } from '~/types/unit'
import { UNIT_STATES } from '~/types/unit'
import { formatUnitClass, formatUnitDimensions, formatUnitSite } from '~/composables/useUnitsList'
import { unitStateLegendSwatches } from '~/composables/useUnitState'

type UnitsView = 'list' | 'map'

const formUnit = ref<ApiUnit | null>(null)
const showForm = ref(false)
const activeView = ref<UnitsView>('list')
const selectedSiteId = ref<number | undefined>(undefined)

const {
  open: filtersOpen,
  appliedFilter,
  workingFilter,
  appliedCount,
  openSlideover,
  cancel: cancelFilters,
  apply: applyFilters,
  clearAll: clearFilters,
  addRootCondition,
  addRootGroup,
  addConditionToGroup,
  removeRootNode,
  removeNode,
  setRootOp
} = useFilterTree('unit')

const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('unit')

const {
  searchQuery,
  stateFilter,
  tabCounts,
  paginatedUnits,
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
  setStateFilter,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useUnitsList({ filter: appliedFilter })

const { items: siteItems } = useOptions('/api/sites/options')

const {
  maps,
  unitsByNumber,
  pending: mapPending,
  error: mapError,
  refresh: refreshMap,
  getHoverDetails
} = useUnitsMapView(selectedSiteId)

const { t } = useI18n()
const localePath = useLocalePath()

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UnitStateBadge = resolveComponent('FacilityUnitStateBadge')
const NuxtLink = resolveComponent('NuxtLink')

const isListView = computed(() => activeView.value === 'list')
const isLoading = computed(() => isListView.value ? pending.value : mapPending.value)
const loadError = computed(() => isListView.value ? error.value : mapError.value)

const TAB_LABELS: Record<UnitStateFilter, string> = {
  all: 'pages.units.filters.all',
  available: 'pages.units.filters.available',
  occupied: 'pages.units.filters.occupied',
  reserved: 'pages.units.filters.reserved',
  out_of_service: 'pages.units.filters.outOfService'
}

const stateTabs = computed<Array<{ key: UnitStateFilter, label: string, count: number }>>(() => {
  const filters: Array<UnitStateFilter> = ['all', 'available', 'occupied', 'reserved', 'out_of_service']

  return filters.map(key => ({
    key,
    label: t(TAB_LABELS[key]),
    count: tabCounts.value[key]
  }))
})

const legendStates = UNIT_STATES

function openCreate() {
  formUnit.value = null
  showForm.value = true
}

function openEdit(unit: ApiUnit) {
  formUnit.value = unit
  showForm.value = true
}

function refreshCurrentView() {
  if (isListView.value) {
    refresh()
    return
  }

  refreshMap()
}

function onSaved() {
  refresh()
  refreshMap()
}

const columns = computed<TableColumn<ApiUnit>[]>(() => [
  {
    accessorKey: 'unit_number',
    header: t('table.unit'),
    cell: ({ row }) => {
      const unit = row.original
      const children = [
        h(NuxtLink, {
          to: localePath(`/facility/units/${unit.id}`),
          class: 'font-medium text-highlighted hover:underline'
        }, () => unit.unit_number)
      ]

      if (unit.state === 'occupied' && unit.tenant_name && unit.contract_id) {
        children.push(
          h('div', { class: 'mt-0.5 text-xs text-dimmed' }, [
            h(NuxtLink, {
              to: localePath(`/leasing/contracts/${unit.contract_id}`),
              class: 'hover:underline'
            }, () => unit.tenant_name)
          ])
        )
      }

      return h('div', children)
    }
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
    id: 'state',
    header: t('table.status'),
    cell: ({ row }) => h(UnitStateBadge, {
      state: row.original.state as UnitState | null | undefined,
      overlock: row.original.overlock
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
      items: [[
        {
          label: t('common.view'),
          icon: 'i-lucide-eye',
          onSelect() {
            navigateTo(localePath(`/facility/units/${row.original.id}`))
          }
        },
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        }
      ]],
      content: { align: 'end' }
    }, {
      default: () => h(UButton, {
        'icon': 'i-lucide-ellipsis',
        'color': 'neutral',
        'variant': 'ghost',
        'size': 'sm',
        'square': true,
        'aria-label': t('common.actions')
      })
    })
  }
])

watch(activeView, (view) => {
  if (view === 'map' && selectedSiteId.value) {
    refreshMap()
  }
})
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
        <div class="flex items-center rounded-lg border border-default p-0.5">
          <UButton
            icon="i-lucide-rows-3"
            :color="activeView === 'list' ? 'primary' : 'neutral'"
            :variant="activeView === 'list' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.units.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-map"
            :color="activeView === 'map' ? 'primary' : 'neutral'"
            :variant="activeView === 'map' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.units.viewMap')"
            @click="activeView = 'map'"
          />
        </div>

        <USelect
          v-if="!isListView"
          v-model="selectedSiteId"
          :items="siteItems"
          value-key="value"
          label-key="label"
          :placeholder="$t('pages.units.selectSite')"
          class="w-full sm:w-56"
        />

        <UButton
          v-if="isListView"
          icon="i-lucide-list-filter"
          color="neutral"
          variant="outline"
          class="shrink-0"
          :label="appliedCount > 0 ? $t('filters.buttonWithCount', { count: appliedCount }) : $t('filters.button')"
          @click="openSlideover"
        />

        <UInput
          v-if="isListView"
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

    <FiltersFilterSlideover
      v-model:open="filtersOpen"
      v-model:working-filter="workingFilter"
      entity-type="unit"
      :fields="filterFields"
      :pending="filterSchemaPending"
      @apply="applyFilters"
      @cancel="cancelFilters"
      @clear="clearFilters"
      @add-condition="addRootCondition"
      @add-group="addRootGroup"
      @add-condition-in-group="addConditionToGroup"
      @remove-root="removeRootNode"
      @remove-in-group="(group, index) => removeNode(group, index)"
      @update:root-op="setRootOp"
    />

    <div
      v-if="isListView"
      class="mt-6 flex flex-wrap items-center gap-1"
    >
      <UButton
        v-for="tab in stateTabs"
        :key="tab.key"
        color="neutral"
        :variant="stateFilter === tab.key ? 'solid' : 'ghost'"
        size="sm"
        class="rounded-full"
        @click="setStateFilter(tab.key)"
      >
        {{ tab.label }}
        <span class="ms-1 tabular-nums">
          {{ tab.count.toLocaleString() }}
        </span>
      </UButton>
    </div>

    <div
      v-if="!isListView"
      class="mt-4 flex flex-wrap items-center gap-3 text-xs text-dimmed"
    >
      <span>{{ $t('pages.units.mapLegend') }}</span>
      <span
        v-for="state in legendStates"
        :key="state"
        class="inline-flex items-center gap-1.5"
      >
        <span
          class="size-2.5 rounded-sm"
          :class="unitStateLegendSwatches[state]"
        />
        {{ $t(`units.state.${state}`) }}
      </span>
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
        {{ $t('pages.units.loadError') }}
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
        style="height: calc(100vh - 320px)"
      >
        <UTable
          :data="paginatedUnits"
          :columns="columns"
        />
      </div>

      <div
        v-else-if="!selectedSiteId"
        class="mt-6 rounded-lg border border-dashed border-default px-4 py-16 text-center"
      >
        <p class="text-sm text-dimmed">
          {{ $t('pages.units.selectSitePrompt') }}
        </p>
      </div>

      <div
        v-else-if="!maps.length"
        class="mt-6 rounded-lg border border-dashed border-default px-4 py-16 text-center"
      >
        <p class="text-sm text-dimmed">
          {{ $t('pages.units.mapEmpty') }}
        </p>
      </div>

      <div
        v-else
        class="mt-6 overflow-hidden rounded-lg border border-default"
      >
        <FacilityUnitsMapView
          :site-id="selectedSiteId"
          :maps="maps"
          :units-by-number="unitsByNumber"
          :get-hover-details="getHoverDetails"
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

    <FacilityUnitFormSlideover
      v-model:open="showForm"
      :unit="formUnit"
      @saved="onSaved"
    />
  </UContainer>
</template>
