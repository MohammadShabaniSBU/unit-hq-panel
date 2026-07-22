<script setup lang="ts">
import type { ContactLifecycleStatus, ContactStatusFilter } from '~/types/contact'
import type { ContactCard } from '~/types/contact-board'
import { CONTACT_LIFECYCLE_STATUSES } from '~/types/contact'

type ContactsView = 'list' | 'board'

const CONTACTS_VIEW_STORAGE_KEY = 'contacts.activeView'

function readStoredContactsView(): ContactsView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(CONTACTS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const { t } = useI18n()
const toast = useToast()

const showForm = ref(false)
const activeView = ref<ContactsView>(readStoredContactsView())
const pendingMoveIds = ref<Array<number>>([])

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(CONTACTS_VIEW_STORAGE_KEY, view)
  }
})

function openCreate() {
  showForm.value = true
}

const {
  searchQuery,
  statusFilter,
  tabCounts,
  paginatedContacts,
  totalCount,
  showingCount,
  selectedIds,
  isAllPageSelected,
  isSomePageSelected,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  pending,
  error,
  refresh,
  setStatusFilter,
  goToPrevPage,
  goToNextPage,
  goToPage,
  toggleSelected,
  toggleAllSelected
} = useContactsList()

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
} = useContactBoard()

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

const TAB_LABELS: Record<ContactStatusFilter, string> = {
  all: 'pages.contacts.all',
  prospect: 'pages.contacts.prospect',
  lead: 'pages.contacts.lead',
  opportunity: 'pages.contacts.opportunity',
  tenant: 'pages.contacts.tenant',
  past_tenant: 'pages.contacts.pastTenant',
  lost: 'pages.contacts.lost'
}

const statusTabs = computed<Array<{ key: ContactStatusFilter, label: string, count: number }>>(() => {
  const filters: Array<ContactStatusFilter> = ['all', ...CONTACT_LIFECYCLE_STATUSES]

  return filters.map(key => ({
    key,
    label: t(TAB_LABELS[key]),
    count: tabCounts.value[key]
  }))
})

function onColumnCardsUpdate(status: ContactLifecycleStatus, cards: Array<ContactCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: ContactLifecycleStatus
  toStatus: ContactLifecycleStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: ContactCard = { ...card, status: fromStatus }

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
      title: t('pages.contacts.board.moveError'),
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
          {{ $t('pages.contacts.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.contacts.subtitle') }}
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
            :aria-label="$t('pages.contacts.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.contacts.viewBoard')"
            @click="activeView = 'board'"
          />
        </div>

        <UInput
          v-model="activeSearchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.contacts.search')"
          class="w-full sm:w-72"
        />
        <UButton
          icon="i-lucide-plus"
          :label="$t('pages.contacts.newContact')"
          color="primary"
          class="shrink-0"
          @click="openCreate"
        />
      </div>
    </div>

    <div
      v-if="activeView === 'list'"
      class="mt-6 flex flex-wrap items-center gap-1"
    >
      <UButton
        v-for="tab in statusTabs"
        :key="tab.key"
        color="neutral"
        :variant="statusFilter === tab.key ? 'solid' : 'ghost'"
        size="sm"
        class="rounded-full"
        @click="setStatusFilter(tab.key)"
      >
        {{ tab.label }}
        <span class="ms-1 tabular-nums">
          {{ tab.count.toLocaleString() }}
        </span>
      </UButton>
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
          {{ $t('pages.contacts.loadError') }}
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
        <div class="mt-4">
          <ContactsTable
            :contacts="paginatedContacts"
            :selected-ids="selectedIds"
            :is-all-page-selected="isAllPageSelected"
            :is-some-page-selected="isSomePageSelected"
            @toggle-selected="toggleSelected"
            @toggle-all-selected="toggleAllSelected"
          />
        </div>

        <FacilityListPagination
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
          {{ $t('pages.contacts.loadError') }}
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

      <ContactsBoard
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

    <ContactFormSlideover
      v-model:open="showForm"
      @saved="onSaved"
    />
  </UContainer>
</template>
