<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiDeal, DealStatus } from '~/types/deal'
import type { DealCard } from '~/types/deal-board'
import { DEAL_STATUSES } from '~/types/deal'
import {
  dealStatusColor,
  formatDealStay
} from '~/composables/useDealsList'

type DealsView = 'list' | 'board'

const DEALS_VIEW_STORAGE_KEY = 'deals.activeView'

function readStoredDealsView(): DealsView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(DEALS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const showForm = ref(false)
const activeView = ref<DealsView>(readStoredDealsView())
const pendingMoveIds = ref<Array<number>>([])

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
} = useFilterTree('deal')

const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('deal')

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(DEALS_VIEW_STORAGE_KEY, view)
  }
})

const {
  searchQuery,
  statusFilter,
  paginatedDeals,
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
} = useDealsList({ filter: appliedFilter })

const {
  searchQuery: boardSearchQuery,
  columns: boardColumns,
  pending: boardPending,
  error: boardError,
  columnLoading,
  reload: reloadBoard,
  loadMore,
  patchStatus,
  setColumnCards,
  adjustTotals,
  replaceCard,
  findColumn
} = useDealBoard()

const activeSearchQuery = computed({
  get: () => (activeView.value === 'board' ? boardSearchQuery.value : searchQuery.value),
  set: (value: string) => {
    if (activeView.value === 'board') {
      boardSearchQuery.value = value
    } else {
      searchQuery.value = value
    }
  }
})

watch(activeView, (view) => {
  if (view === 'board' && boardColumns.value.length === 0 && !boardPending.value) {
    reloadBoard()
  }
}, { immediate: true })

const { t } = useI18n()
const { formatDate } = useOrgDateFormat()
const toast = useToast()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  showForm.value = true
}

function openEdit(_deal: ApiDeal) {
  // Edit flow to be implemented later.
}

const statusFilterOptions = computed(() => [
  { label: t('pages.deals.allStatuses'), value: 'all' },
  ...DEAL_STATUSES.map(status => ({
    label: t(`dealStatus.${status}`),
    value: status
  }))
])

const router = useRouter()

function openDeal(_event: Event, row: TableRow<ApiDeal>) {
  if (!row.original.id) {
    return
  }
  router.push(`/leasing/deals/${row.original.id}`)
}

function onColumnCardsUpdate(status: DealStatus, cards: Array<DealCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: DealStatus
  toStatus: DealStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: DealCard = { ...card, status: fromStatus }

  adjustTotals(fromStatus, toStatus)
  replaceCard(toStatus, { ...card, status: toStatus })
  pendingMoveIds.value = [...pendingMoveIds.value, cardId]

  try {
    const updated = await patchStatus(cardId, toStatus)
    replaceCard(toStatus, updated)
  } catch {
    const currentTo = findColumn(toStatus)
    const currentFrom = findColumn(fromStatus)

    if (currentTo) {
      setColumnCards(
        toStatus,
        currentTo.cards.filter(item => item.id !== cardId)
      )
    }

    if (currentFrom) {
      setColumnCards(fromStatus, [previousCard, ...currentFrom.cards])
    }

    adjustTotals(toStatus, fromStatus)

    toast.add({
      title: t('pages.deals.board.moveError'),
      color: 'error'
    })
  } finally {
    pendingMoveIds.value = pendingMoveIds.value.filter(id => id !== cardId)
  }
}

function onSaved() {
  refresh()
  if (activeView.value === 'board') {
    reloadBoard()
  }
}

const columns = computed<Array<TableColumn<ApiDeal>>>(() => [
  {
    id: 'contact',
    header: t('table.contact'),
    cell: ({ row }) => h(
      'span',
      { class: 'font-medium text-highlighted' },
      row.original.contact?.name ?? `#${row.original.contact_id}`
    )
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`dealStatus.${row.original.status}`),
      color: dealStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'expected_move_in',
    header: t('table.expectedMoveIn'),
    cell: ({ row }) => formatDate(row.original.expected_move_in, { empty: t('common.emptyValue') })
  },
  {
    id: 'stay',
    header: t('table.stay'),
    cell: ({ row }) => formatDealStay(row.original, t('common.emptyValue'))
  },
  {
    id: 'desired_unit_class',
    header: t('table.class'),
    cell: ({ row }) => row.original.desired_unit_class?.label ?? t('common.emptyValue')
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
  <UContainer
    :class="activeView === 'board'
      ? 'flex h-[calc(100svh-4rem)] flex-col overflow-hidden py-4'
      : 'py-8'"
  >
    <div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ $t('pages.deals.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.deals.subtitle') }}
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
            :aria-label="$t('pages.deals.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.deals.viewBoard')"
            @click="activeView = 'board'"
          />
        </div>

        <UButton
          v-if="activeView === 'list'"
          icon="i-lucide-list-filter"
          color="neutral"
          variant="outline"
          class="shrink-0"
          :label="appliedCount > 0 ? $t('filters.buttonWithCount', { count: appliedCount }) : $t('filters.button')"
          @click="openSlideover"
        />
        <UInput
          v-model="activeSearchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.deals.search')"
          class="w-full sm:w-72"
        />
        <USelect
          v-if="activeView === 'list'"
          v-model="statusFilter"
          :items="statusFilterOptions"
          value-key="value"
          label-key="label"
          class="w-full sm:w-48"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.deals.newDeal')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <FiltersFilterSlideover
      v-model:open="filtersOpen"
      entity-type="deal"
      v-model:working-filter="workingFilter"
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

    <template v-if="activeView === 'list'">
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
          {{ $t('pages.deals.loadError') }}
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
        <div
          class="mt-6 overflow-hidden rounded-lg border border-default"
          style="height: calc(100vh - 260px)"
        >
          <UTable
            :data="paginatedDeals"
            :columns="columns"
            @select="openDeal"
          />
        </div>

        <FacilityListPagination
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
    </template>

    <div
      v-else
      class="mt-4 min-h-0 flex-1"
    >
      <div
        v-if="boardPending && boardColumns.length === 0"
        class="flex h-full items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="boardError && boardColumns.length === 0"
        class="rounded-lg border border-error/30 bg-error/5 p-4"
      >
        <p class="text-sm text-error">
          {{ $t('pages.deals.loadError') }}
        </p>
        <UButton
          :label="$t('common.retry')"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="reloadBoard()"
        />
      </div>

      <DealsBoard
        v-else
        class="h-full"
        :columns="boardColumns"
        :column-loading="columnLoading"
        :pending-move-ids="pendingMoveIds"
        @load-more="loadMore"
        @move="onCardMove"
        @update:column-cards="onColumnCardsUpdate"
      />
    </div>

    <LeasingDealFormSlideover
      v-model:open="showForm"
      @saved="onSaved"
    />
  </UContainer>
</template>
