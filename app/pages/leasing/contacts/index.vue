<script setup lang="ts">
import type { ContactLifecycleStatus, ContactStatusFilter } from '~/types/contact'
import type { ContactCard } from '~/types/contact-board'
import { CONTACT_LIFECYCLE_STATUSES } from '~/types/contact'
import { Permission } from '~/types/permissions'

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
const { can } = usePermissions()
const canShareView = computed(() => can(Permission.MarketingManage))

const showForm = ref(false)
const activeView = ref<ContactsView>(readStoredContactsView())
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
  setRootOp,
  setWorking
} = useFilterTree('contact')

const { segments, fetchSegments, save: saveSegment } = useSegments('all')
const selectedViewId = ref<number | undefined>(undefined)
const saveViewOpen = ref(false)
const viewName = ref('')
const shareView = ref(false)
const savingView = ref(false)

const { fields: filterFields, pending: filterSchemaPending } = useFilterSchema('contact')

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(CONTACTS_VIEW_STORAGE_KEY, view)
  }
})

function openCreate() {
  showForm.value = true
}

const viewItems = computed(() => segments.value.map(segment => ({
  label: segment.invalid_field
    ? segment.name
    : `${segment.name} (${segment.count ?? 0})`,
  value: segment.id
})))

onMounted(() => {
  void fetchSegments()
})

function onPickView(id: number | string | undefined) {
  if (id == null || id === '') {
    selectedViewId.value = undefined
    return
  }

  const numeric = Number(id)
  selectedViewId.value = numeric
  const segment = segments.value.find(item => item.id === numeric)
  if (!segment) {
    return
  }

  if (segment.invalid_field) {
    toast.add({
      title: t('pages.contacts.viewInvalid', { field: segment.invalid_field }),
      color: 'error'
    })
    return
  }

  setWorking(segment.filter)
  applyFilters()
}

function onClearFilters() {
  selectedViewId.value = undefined
  clearFilters()
}

async function onSaveView() {
  if (!appliedFilter.value || appliedFilter.value.conditions.length === 0) {
    toast.add({ title: t('pages.contacts.saveViewEmpty'), color: 'error' })
    return
  }

  savingView.value = true
  try {
    const created = await saveSegment({
      name: viewName.value.trim(),
      filter: appliedFilter.value,
      is_shared: shareView.value && canShareView.value
    })
    saveViewOpen.value = false
    viewName.value = ''
    shareView.value = false
    await fetchSegments()
    selectedViewId.value = created.id
    toast.add({ title: t('pages.contacts.viewSaved'), color: 'success' })
  } catch {
    toast.add({ title: t('pages.contacts.viewSaveError'), color: 'error' })
  } finally {
    savingView.value = false
  }
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
  perPage,
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
} = useContactsList({ filter: appliedFilter })

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
      : 'py-4'"
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

        <USelectMenu
          v-if="activeView === 'list' && viewItems.length > 0"
          :model-value="selectedViewId"
          :items="viewItems"
          value-key="value"
          :placeholder="$t('pages.contacts.savedViews')"
          class="w-full sm:w-56"
          @update:model-value="onPickView"
        />
        <UButton
          v-if="activeView === 'list'"
          icon="i-lucide-list-filter"
          color="neutral"
          variant="outline"
          class="shrink-0"
          :label="appliedCount > 0 ? $t('filters.buttonWithCount', { count: appliedCount }) : $t('filters.button')"
          @click="openSlideover"
        />
        <UButton
          v-if="activeView === 'list'"
          icon="i-lucide-bookmark"
          color="neutral"
          variant="outline"
          class="shrink-0"
          :label="$t('pages.contacts.saveView')"
          @click="saveViewOpen = true"
        />
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

    <FiltersFilterSlideover
      v-model:open="filtersOpen"
      entity-type="contact"
      v-model:working-filter="workingFilter"
      :fields="filterFields"
      :pending="filterSchemaPending"
      @apply="applyFilters"
      @cancel="cancelFilters"
      @clear="onClearFilters"
      @add-condition="addRootCondition"
      @add-group="addRootGroup"
      @add-condition-in-group="addConditionToGroup"
      @remove-root="removeRootNode"
      @remove-in-group="(group, index) => removeNode(group, index)"
      @update:root-op="setRootOp"
    />

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
        v-if="pending && !paginatedContacts.length"
        class="mt-6 flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="error && !paginatedContacts.length"
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
            :pending="pending"
            @toggle-selected="toggleSelected"
            @toggle-all-selected="toggleAllSelected"
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

    <UModal
      v-model:open="saveViewOpen"
      :title="$t('pages.contacts.saveView')"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="onSaveView"
        >
          <UFormField :label="$t('pages.contacts.viewName')">
            <UInput
              v-model="viewName"
              class="w-full"
              required
            />
          </UFormField>
          <UCheckbox
            v-if="canShareView"
            v-model="shareView"
            :label="$t('pages.contacts.shareView')"
          />
          <div class="flex justify-end">
            <UButton
              type="submit"
              :label="$t('pages.contacts.saveView')"
              :loading="savingView"
            />
          </div>
        </form>
      </template>
    </UModal>
  </UContainer>
</template>
