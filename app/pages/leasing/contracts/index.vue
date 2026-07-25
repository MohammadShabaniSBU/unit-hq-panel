<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiContract, ContractStatus, ContractStatusFilter } from '~/types/contract'
import type { ContractCard } from '~/types/contract-board'
import { CONTRACT_STATUSES } from '~/types/contract'
import { contractStatusColor } from '~/composables/useContractsList'

type ContractsView = 'list' | 'board'

const CONTRACTS_VIEW_STORAGE_KEY = 'contracts.activeView'

function readStoredContractsView(): ContractsView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(CONTRACTS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const activeView = ref<ContractsView>(readStoredContractsView())
const pendingMoveIds = ref<Array<number>>([])
const showForm = ref(false)

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
} = useFilterTree('contract')

const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('contract')

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(CONTRACTS_VIEW_STORAGE_KEY, view)
  }
})

const {
  searchQuery,
  statusFilter,
  paginatedContracts,
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
} = useContractsList({ filter: appliedFilter })

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
} = useContractBoard()

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

const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusFilterOptions = computed(() => [
  { label: t('pages.contracts.allStatuses'), value: 'all' as ContractStatusFilter },
  ...CONTRACT_STATUSES.map(status => ({
    label: t(`contractStatus.${status}`),
    value: status as ContractStatusFilter
  }))
])

function onColumnCardsUpdate(status: ContractStatus, cards: Array<ContractCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: ContractStatus
  toStatus: ContractStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: ContractCard = { ...card, status: fromStatus }

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
      title: t('pages.contracts.board.moveError'),
      color: 'error'
    })
  } finally {
    pendingMoveIds.value = pendingMoveIds.value.filter(id => id !== cardId)
  }
}

const columns = computed<Array<TableColumn<ApiContract>>>(() => [
  {
    id: 'contact',
    header: t('table.contact'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' },
      row.original.contact?.name ?? `#${row.original.contact_id}`)
  },
  {
    id: 'unit',
    header: t('table.unit'),
    cell: ({ row }) => {
      const unitItem = row.original.items?.find(i => i.item_type === 'unit')
      const unit = unitItem?.item as { unit_number?: string, site?: { name?: string } } | null | undefined
      if (!unit) return unitItem ? `#${unitItem.item_id}` : '—'
      return `${unit.unit_number ?? ''}${unit.site?.name ? ` · ${unit.site.name}` : ''}`
    }
  },
  {
    id: 'rate',
    header: 'Rate',
    cell: ({ row }) => {
      const unitItem = row.original.items?.find(i => i.item_type === 'unit')
      return unitItem ? `£${unitItem.amount}/mo` : '—'
    }
  },
  {
    accessorKey: 'start_date',
    header: 'Start',
    cell: ({ row }) => row.original.start_date
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`contractStatus.${row.original.status}`),
      color: contractStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-10', td: 'w-10 text-right' } },
    cell: ({ row }) => h(UDropdownMenu, {
      items: [[
        {
          label: t('pages.contracts.viewContract'),
          icon: 'i-lucide-file-text',
          onSelect() {
            router.push(`/leasing/contracts/${row.original.id}`)
          }
        },
        {
          label: t('pages.contracts.detail.viewDeal'),
          icon: 'i-lucide-link-2',
          disabled: !row.original.deal_id,
          onSelect() {
            if (row.original.deal_id) router.push(`/leasing/deals/${row.original.deal_id}`)
          }
        },
        {
          label: t('pages.contracts.detail.viewContact'),
          icon: 'i-lucide-user',
          onSelect() {
            router.push(`/leasing/contacts/${row.original.contact_id}`)
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

function onRowSelect(_event: Event, row: TableRow<ApiContract>) {
  if (!row.original.id) return
  router.push(`/leasing/contracts/${row.original.id}`)
}
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
          {{ $t('pages.contracts.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.contracts.subtitle') }}
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
            :aria-label="$t('pages.contracts.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.contracts.viewBoard')"
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
          :placeholder="$t('pages.contracts.search')"
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
          v-if="activeView === 'list'"
          icon="i-lucide-plus"
          :label="$t('pages.contracts.newContract')"
          color="primary"
          class="shrink-0"
          @click="showForm = true"
        />
      </div>
    </div>

    <FiltersFilterSlideover
      v-model:open="filtersOpen"
      entity-type="contract"
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
          {{ $t('pages.contracts.loadError') }}
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
            :data="paginatedContracts"
            :columns="columns"
            class="cursor-pointer"
            @select="onRowSelect"
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
          {{ $t('pages.contracts.loadError') }}
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

      <ContractsBoard
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

    <LeasingContractFormSlideover
      v-model:open="showForm"
      @saved="refresh()"
    />
  </UContainer>
</template>
