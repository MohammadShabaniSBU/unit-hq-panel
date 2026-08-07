<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { TaskStatus } from '~/types/task'
import type { TaskBoardColumn, TaskCard } from '~/types/task-board'
import { taskPriorityColor, taskablePath } from '~/types/task'

const props = defineProps<{
  columns: Array<TaskBoardColumn>
  columnLoading: Partial<Record<TaskStatus, boolean>>
  pendingMoveIds?: Array<number>
}>()

const emit = defineEmits<{
  'loadMore': [status: TaskStatus]
  'move': [payload: {
    cardId: number
    fromStatus: TaskStatus
    toStatus: TaskStatus
    toIndex: number
  }]
  'select': [card: TaskCard]
  'update:columnCards': [status: TaskStatus, cards: Array<TaskCard>]
}>()

const suppressClick = ref(false)
const scrollRoots = new Map<TaskStatus, HTMLElement>()
const sentinels = new Map<TaskStatus, HTMLElement>()
const observers = new Map<TaskStatus, IntersectionObserver>()
/** Edge-trigger: only load when sentinel transitions false → true */
const wasNotIntersecting = new Map<TaskStatus, boolean>()

function disconnectObserver(status: TaskStatus) {
  observers.get(status)?.disconnect()
  observers.delete(status)
}

function observeColumn(status: TaskStatus) {
  disconnectObserver(status)

  const root = scrollRoots.get(status)
  const sentinel = sentinels.get(status)
  const column = props.columns.find(item => item.status === status)

  if (!root || !sentinel || !column?.has_more) {
    return
  }

  if (!wasNotIntersecting.has(status)) {
    wasNotIntersecting.set(status, false)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      const previouslyNotIntersecting = wasNotIntersecting.get(status) === true
      wasNotIntersecting.set(status, !entry.isIntersecting)

      if (
        entry.isIntersecting
        && previouslyNotIntersecting
        && !props.columnLoading[status]
      ) {
        emit('loadMore', status)
      }
    },
    {
      root,
      rootMargin: '80px 0px',
      threshold: 0
    }
  )

  observer.observe(sentinel)
  observers.set(status, observer)
}

function setScrollRoot(status: TaskStatus, el: Element | null) {
  if (el instanceof HTMLElement) {
    scrollRoots.set(status, el)
  } else {
    scrollRoots.delete(status)
    disconnectObserver(status)
    wasNotIntersecting.delete(status)
  }

  observeColumn(status)
}

function setSentinel(status: TaskStatus, el: Element | null) {
  if (el instanceof HTMLElement) {
    sentinels.set(status, el)
  } else {
    sentinels.delete(status)
    disconnectObserver(status)
    wasNotIntersecting.delete(status)
  }

  observeColumn(status)
}

watch(
  () => props.columns.map(column => `${column.status}:${column.has_more}:${column.next_cursor}`),
  () => {
    nextTick(() => {
      for (const column of props.columns) {
        observeColumn(column.status)
      }
    })
  }
)

onBeforeUnmount(() => {
  for (const status of [...observers.keys()]) {
    disconnectObserver(status)
  }
  wasNotIntersecting.clear()
})

async function onAdd(
  toStatus: TaskStatus,
  event: { newIndex?: number | null, item?: HTMLElement }
) {
  suppressClick.value = true
  await nextTick()

  const cardId = Number(event.item?.dataset.cardId)
  const fromStatus = event.item?.dataset.fromStatus as TaskStatus | undefined
  const toIndex = event.newIndex ?? 0

  if (!cardId || !fromStatus || fromStatus === toStatus) {
    return
  }

  emit('move', {
    cardId,
    fromStatus,
    toStatus,
    toIndex
  })
}

function onDragStart() {
  suppressClick.value = false
}

function onDragEnd() {
  suppressClick.value = true
  window.setTimeout(() => {
    suppressClick.value = false
  }, 0)
}

function openTask(card: TaskCard) {
  if (suppressClick.value) {
    return
  }

  emit('select', card)
}

function titleInitials(card: TaskCard): string {
  const title = card.title.trim()
  if (!title) {
    return `#${card.id}`
  }

  const parts = title.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}
</script>

<template>
  <div class="flex h-full min-h-0 gap-4 overflow-x-auto">
    <div
      v-for="column in columns"
      :key="column.status"
      class="flex h-full w-72 shrink-0 flex-col rounded-lg border border-default bg-default"
    >
      <div class="flex shrink-0 items-center justify-between gap-2 border-b border-default px-3 py-2.5">
        <p class="text-sm font-medium text-highlighted">
          {{ $t(`taskStatus.${column.status}`) }}
        </p>
        <span class="rounded-md bg-elevated px-1.5 py-0.5 text-xs tabular-nums text-dimmed">
          {{ column.total.toLocaleString() }}
        </span>
      </div>

      <div
        :ref="(el) => setScrollRoot(column.status, el as Element | null)"
        class="min-h-0 flex-1 overflow-y-auto"
      >
        <VueDraggable
          :model-value="column.cards"
          class="flex min-h-full flex-col gap-2 p-2"
          group="task-board"
          :animation="150"
          :sort="false"
          ghost-class="opacity-40"
          chosen-class="kanban-chosen"
          @update:model-value="(cards: Array<TaskCard>) => emit('update:columnCards', column.status, cards)"
          @add="(event: { newIndex?: number | null, item?: HTMLElement }) => onAdd(column.status, event)"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <div
            v-for="card in column.cards"
            :key="card.id"
            :data-card-id="card.id"
            :data-from-status="card.status"
            role="button"
            tabindex="0"
            class="cursor-pointer rounded-md border border-default bg-default p-3 active:cursor-grabbing"
            :class="{ 'pointer-events-none opacity-60': pendingMoveIds?.includes(card.id) }"
            @click="openTask(card)"
            @keydown.enter="openTask(card)"
          >
            <div class="flex items-start gap-2.5">
              <UAvatar
                :text="titleInitials(card)"
                size="sm"
                class="bg-elevated text-highlighted shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ card.title || $t('pages.tasks.board.untitled', { id: card.id }) }}
                </p>
                <NuxtLink
                  v-if="card.taskable?.label && taskablePath(card.taskable)"
                  :to="taskablePath(card.taskable)!"
                  class="mt-0.5 block truncate text-xs text-primary hover:underline"
                  @click.stop
                >
                  {{ card.taskable.label }}
                </NuxtLink>
                <p
                  v-else-if="card.taskable?.label"
                  class="mt-0.5 truncate text-xs text-dimmed"
                >
                  {{ card.taskable.label }}
                </p>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <UBadge
                    :label="$t(`taskPriority.${card.priority}`)"
                    :color="taskPriorityColor(card.priority)"
                    variant="subtle"
                    size="sm"
                  />
                  <UBadge
                    v-if="card.type"
                    :label="$t(`taskType.${card.type}`)"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <p
                  v-if="card.due_date"
                  class="mt-1.5 text-xs text-muted"
                >
                  {{ $t('pages.tasks.board.due', { date: card.due_date }) }}
                </p>
                <p
                  v-if="card.assignee?.name"
                  class="mt-0.5 truncate text-xs text-muted"
                >
                  {{ card.assignee.name }}
                </p>
                <div
                  v-if="card.taskable?.type === 'contact'"
                  class="mt-2 print:hidden"
                  @click.stop
                >
                  <CallsCallButton
                    :contact-id="card.taskable.id"
                    context-type="task"
                    :context-id="card.id"
                    :label="$t('calls.call')"
                    size="xs"
                    color="neutral"
                    variant="soft"
                  />
                </div>
              </div>
            </div>
          </div>

          <p
            v-if="column.cards.length === 0"
            class="px-1 py-2 text-center text-xs text-dimmed"
          >
            {{ $t('pages.tasks.board.emptyColumn') }}
          </p>
        </VueDraggable>

        <div
          v-if="column.has_more"
          :ref="(el) => setSentinel(column.status, el as Element | null)"
          class="flex h-10 items-center justify-center"
          aria-hidden="true"
        >
          <UIcon
            v-if="columnLoading[column.status]"
            name="i-lucide-loader-circle"
            class="size-4 animate-spin text-dimmed"
          />
        </div>
      </div>
    </div>
  </div>
</template>
