<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiOffer, OfferStatus } from '~/types/offer'
import type { OfferCard } from '~/types/offer-board'
import { OFFER_STATUSES } from '~/types/offer'
import { offerStatusColor } from '~/composables/useOffersList'

type OffersView = 'list' | 'board'

const OFFERS_VIEW_STORAGE_KEY = 'offers.activeView'

function readStoredOffersView(): OffersView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(OFFERS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const activeView = ref<OffersView>(readStoredOffersView())
const pendingMoveIds = ref<Array<number>>([])

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(OFFERS_VIEW_STORAGE_KEY, view)
  }
})

const {
  searchQuery,
  statusFilter,
  paginatedOffers,
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
} = useOffersList()

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
} = useOfferBoard()

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

const statusFilterOptions = computed(() => [
  { label: t('pages.offers.allStatuses'), value: 'all' },
  ...OFFER_STATUSES.map(status => ({
    label: t(`offerStatus.${status}`),
    value: status
  }))
])

function openOffer(_event: Event, row: TableRow<ApiOffer>) {
  if (!row.original.id) {
    return
  }
  router.push(`/leasing/offers/${row.original.id}`)
}

function onColumnCardsUpdate(status: OfferStatus, cards: Array<OfferCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: OfferStatus
  toStatus: OfferStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: OfferCard = { ...card, status: fromStatus }

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
      title: t('pages.offers.board.moveError'),
      color: 'error'
    })
  } finally {
    pendingMoveIds.value = pendingMoveIds.value.filter(id => id !== cardId)
  }
}

const columns = computed<Array<TableColumn<ApiOffer>>>(() => [
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
    accessorKey: 'deal_id',
    header: t('table.deal'),
    cell: ({ row }) => h(UButton, {
      label: `Deal #${row.original.deal_id}`,
      color: 'neutral',
      variant: 'link',
      size: 'sm',
      class: 'px-0',
      onClick(e: Event) {
        e.stopPropagation()
        router.push(`/leasing/deals/${row.original.deal_id}`)
      }
    })
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`offerStatus.${row.original.status}`),
      color: offerStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'expires_at',
    header: t('table.expiresAt'),
    cell: ({ row }) => row.original.expires_at ?? t('common.emptyValue')
  },
  {
    accessorKey: 'sent_at',
    header: t('table.sentAt'),
    cell: ({ row }) => row.original.sent_at ?? t('common.emptyValue')
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
          {{ $t('pages.offers.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.offers.subtitle') }}
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
            :aria-label="$t('pages.offers.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.offers.viewBoard')"
            @click="activeView = 'board'"
          />
        </div>

        <UInput
          v-model="activeSearchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.offers.search')"
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
          {{ $t('pages.offers.loadError') }}
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
            :data="paginatedOffers"
            :columns="columns"
            @select="openOffer"
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
          {{ $t('pages.offers.loadError') }}
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

      <OffersBoard
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
