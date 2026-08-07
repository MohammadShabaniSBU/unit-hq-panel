<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { ApiTask, TaskStatus } from '~/types/task'
import type { TaskCard } from '~/types/task-board'
import { TASK_STATUSES, taskPriorityColor, taskStatusColor, taskablePath } from '~/types/task'

type TasksView = 'list' | 'board'

const TASKS_VIEW_STORAGE_KEY = 'tasks.activeView'

function readStoredTasksView(): TasksView {
  if (!import.meta.client) {
    return 'list'
  }

  const stored = window.localStorage.getItem(TASKS_VIEW_STORAGE_KEY)
  return stored === 'board' || stored === 'list' ? stored : 'list'
}

const showForm = ref(false)
const editingTask = ref<ApiTask | null>(null)
const openingTask = ref(false)
const activeView = ref<TasksView>(readStoredTasksView())
const pendingMoveIds = ref<Array<number>>([])

const { fetchTask } = useTask()

watch(activeView, (view) => {
  if (import.meta.client) {
    window.localStorage.setItem(TASKS_VIEW_STORAGE_KEY, view)
  }
})

const {
  searchQuery,
  statusFilter,
  paginatedTasks,
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
} = useTasksList()

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
} = useTaskBoard()

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
const CallsCallButton = resolveComponent('CallsCallButton')

const statusFilterOptions = computed(() => [
  { label: t('pages.tasks.allStatuses'), value: 'all' },
  ...TASK_STATUSES.map(status => ({
    label: t(`taskStatus.${status}`),
    value: status
  }))
])

function openCreateForm() {
  editingTask.value = null
  showForm.value = true
}

async function openTaskForEdit(taskId: number, fallback?: ApiTask) {
  if (openingTask.value) {
    return
  }

  openingTask.value = true

  try {
    editingTask.value = await fetchTask(taskId)
    showForm.value = true
  } catch {
    if (fallback) {
      editingTask.value = fallback
      showForm.value = true
      return
    }

    toast.add({
      title: t('pages.tasks.loadError'),
      color: 'error'
    })
  } finally {
    openingTask.value = false
  }
}

function openTask(_event: Event, row: TableRow<ApiTask>) {
  void openTaskForEdit(row.original.id, row.original)
}

function onBoardSelect(card: TaskCard) {
  void openTaskForEdit(card.id)
}

function onColumnCardsUpdate(status: TaskStatus, cards: Array<TaskCard>) {
  setColumnCards(status, cards)
}

async function onCardMove(payload: {
  cardId: number
  fromStatus: TaskStatus
  toStatus: TaskStatus
  toIndex: number
}) {
  const { cardId, fromStatus, toStatus } = payload
  const toColumn = findColumn(toStatus)
  const card = toColumn?.cards.find(item => item.id === cardId)

  if (!card || fromStatus === toStatus) {
    return
  }

  const previousCard: TaskCard = { ...card, status: fromStatus }

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
      title: t('pages.tasks.board.moveError'),
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

const columns = computed<Array<TableColumn<ApiTask>>>(() => [
  {
    accessorKey: 'title',
    header: t('table.title'),
    cell: ({ row }) => h(
      'span',
      { class: 'font-medium text-highlighted' },
      row.original.title
    )
  },
  {
    accessorKey: 'status',
    header: t('table.status'),
    cell: ({ row }) => h(UBadge, {
      label: t(`taskStatus.${row.original.status}`),
      color: taskStatusColor(row.original.status),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'priority',
    header: t('table.priority'),
    cell: ({ row }) => h(UBadge, {
      label: t(`taskPriority.${row.original.priority}`),
      color: taskPriorityColor(row.original.priority),
      variant: 'subtle',
      size: 'sm'
    })
  },
  {
    accessorKey: 'type',
    header: t('table.type'),
    cell: ({ row }) => row.original.type
      ? t(`taskType.${row.original.type}`)
      : t('common.emptyValue')
  },
  {
    accessorKey: 'due_date',
    header: t('table.dueDate'),
    cell: ({ row }) => row.original.due_date ?? t('common.emptyValue')
  },
  {
    id: 'assignee',
    header: t('table.assignee'),
    cell: ({ row }) => row.original.assignee?.name ?? t('common.emptyValue')
  },
  {
    id: 'related',
    header: t('table.related'),
    cell: ({ row }) => {
      const taskable = row.original.taskable
      if (!taskable) {
        return t('common.emptyValue')
      }

      const path = taskablePath(taskable)
      if (!path) {
        return taskable.label
      }

      return h(UButton, {
        label: taskable.label,
        color: 'neutral',
        variant: 'link',
        size: 'sm',
        class: 'px-0',
        onClick(e: Event) {
          e.stopPropagation()
          router.push(path)
        }
      })
    }
  },
  {
    id: 'call',
    header: '',
    cell: ({ row }) => {
      const taskable = row.original.taskable
      if (!taskable || taskable.type !== 'contact') {
        return null
      }
      return h('div', {
        class: 'flex justify-end',
        onClick: (e: Event) => e.stopPropagation()
      }, [
        h(CallsCallButton, {
          contactId: taskable.id,
          contextType: 'task',
          contextId: row.original.id,
          iconOnly: true,
          size: 'xs',
          color: 'neutral',
          variant: 'ghost'
        })
      ])
    }
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
          {{ $t('pages.tasks.title') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ $t('pages.tasks.subtitle') }}
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
            :aria-label="$t('pages.tasks.viewList')"
            @click="activeView = 'list'"
          />
          <UButton
            icon="i-lucide-columns-3"
            :color="activeView === 'board' ? 'primary' : 'neutral'"
            :variant="activeView === 'board' ? 'soft' : 'ghost'"
            size="sm"
            square
            :aria-label="$t('pages.tasks.viewBoard')"
            @click="activeView = 'board'"
          />
        </div>

        <UInput
          v-model="activeSearchQuery"
          icon="i-lucide-search"
          :placeholder="$t('pages.tasks.search')"
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
          :label="$t('pages.tasks.newTask')"
          color="primary"
          class="shrink-0"
          @click="openCreateForm"
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
          {{ $t('pages.tasks.loadError') }}
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
            :data="paginatedTasks"
            :columns="columns"
            @select="openTask"
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
          {{ $t('pages.tasks.loadError') }}
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

      <TasksBoard
        v-else
        class="h-full"
        :columns="boardColumns"
        :column-loading="columnLoading"
        :pending-move-ids="pendingMoveIds"
        @load-more="loadMore"
        @move="onCardMove"
        @select="onBoardSelect"
        @update:column-cards="onColumnCardsUpdate"
      />
    </div>

    <TasksTaskFormSlideover
      v-model:open="showForm"
      :task="editingTask"
      @saved="onSaved"
    />
  </UContainer>
</template>
