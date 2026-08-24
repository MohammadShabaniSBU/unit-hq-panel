<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiReservation, ReservationStatus, ReservationStatusFilter } from '~/types/reservation'
import type { ReservationCard } from '~/types/reservation-board'
import { RESERVATION_STATUSES } from '~/types/reservation'
import { reservationStatusColor } from '~/composables/useReservationsList'

type ReservationsView = 'list' | 'board'

const RESERVATIONS_VIEW_STORAGE_KEY = 'reservations.activeView'

function readStoredReservationsView(): ReservationsView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(RESERVATIONS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const activeView = ref<ReservationsView>(readStoredReservationsView())
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
} = useFilterTree('reservation')

const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('reservation')

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(RESERVATIONS_VIEW_STORAGE_KEY, view)
  }
})

const {
  searchQuery,
  statusFilter,
  paginatedReservations,
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
} = useReservationsList({ filter: appliedFilter })

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
} = useReservationBoard()

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
const { formatDateTime } = useOrgDateFormat()
const toast = useToast()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const statusFilterOptions = computed(() => [
  { label: t('pages.reservations.allStatuses'), value: 'all' as ReservationStatusFilter },
  ...RESERVATION_STATUSES.map(status => ({
    label: t(`reservationStatus.${status}`),
    value: status as ReservationStatusFilter
  }))
])

function openReservation(_event: Event, row: TableRow<ApiReservation>) {
  if (!row.original.id) {
    return
  }
  router.push(`/leasing/reservations/${row.original.id}`)
}

function onColumnCardsUpdate(status: ReservationStatus, cards: Array<ReservationCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: ReservationStatus
  toStatus: ReservationStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: ReservationCard = { ...card, status: fromStatus }

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
      title: t('pages.reservations.board.moveError'),
      color: 'error'
    })
  } finally {
    pendingMoveIds.value = pendingMoveIds.value.filter(id => id !== cardId)
  }
}

const columns = computed<Array<TableColumn<ApiReservation>>>(() => [
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
      const unit = row.original.unit
      if (!unit) return `#${row.original.unit_id}`
      return `${unit.unit_number}${unit.site ? ` · ${unit.site.name}` : ''}`
    }
  },
  {
    id: 'deal',
    header: t('table.deal'),
    cell: ({ row }) => row.original.deal_id
      ? h(UButton, {
          label: `Deal #${row.original.deal_id}`,
          color: 'neutral',
          variant: 'link',
          size: 'sm',
          class: 'px-0',
          onClick() { router.push(`/leasing/deals/${row.original.deal_id}`) }
        })
      : '—'
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`reservationStatus.${row.original.status}`),
      color: reservationStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'expires_at',
    header: t('table.expiresAt'),
    cell: ({ row }) => formatDateTime(row.original.expires_at)
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
          label: 'View reservation',
          icon: 'i-lucide-eye',
          onSelect() {
            router.push(`/leasing/reservations/${row.original.id}`)
          }
        },
        {
          label: row.original.deal_id ? 'View deal' : t('common.actions'),
          icon: 'i-lucide-external-link',
          onSelect() {
            if (row.original.deal_id) router.push(`/leasing/deals/${row.original.deal_id}`)
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
          {{ $t('pages.reservations.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.reservations.subtitle') }}
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
            :aria-label="$t('pages.reservations.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.reservations.viewBoard')"
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
          :placeholder="$t('pages.reservations.search')"
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
      </div>
    </div>

    <FiltersFilterSlideover
      v-model:open="filtersOpen"
      entity-type="reservation"
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
          {{ $t('pages.reservations.loadError') }}
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
            :data="paginatedReservations"
            :columns="columns"
            @select="openReservation"
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
          {{ $t('pages.reservations.loadError') }}
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

      <ReservationsBoard
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
  </UContainer>
</template>
