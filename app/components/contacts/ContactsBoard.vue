<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { ContactLifecycleStatus } from '~/types/contact'
import type { ContactBoardColumn, ContactCard } from '~/types/contact-board'
import { useContactFormatters } from '~/composables/useContactsList'

const props = defineProps<{
  columns: Array<ContactBoardColumn>
  columnLoading: Partial<Record<ContactLifecycleStatus, boolean>>
  pendingMoveIds?: Array<number>
}>()

const emit = defineEmits<{
  'loadMore': [status: ContactLifecycleStatus]
  'move': [payload: {
    cardId: number
    fromStatus: ContactLifecycleStatus
    toStatus: ContactLifecycleStatus
    toIndex: number
  }]
  'update:columnCards': [status: ContactLifecycleStatus, cards: Array<ContactCard>]
}>()

const { formatContactName, formatContactInitials } = useContactFormatters()

const suppressClick = ref(false)
const scrollRoots = new Map<ContactLifecycleStatus, HTMLElement>()
const sentinels = new Map<ContactLifecycleStatus, HTMLElement>()
const observers = new Map<ContactLifecycleStatus, IntersectionObserver>()
/** Edge-trigger: only load when sentinel transitions false → true */
const wasNotIntersecting = new Map<ContactLifecycleStatus, boolean>()

function disconnectObserver(status: ContactLifecycleStatus) {
  observers.get(status)?.disconnect()
  observers.delete(status)
}

function observeColumn(status: ContactLifecycleStatus) {
  disconnectObserver(status)

  const root = scrollRoots.get(status)
  const sentinel = sentinels.get(status)
  const column = props.columns.find(item => item.status === status)

  if (!root || !sentinel || !column?.has_more) {
    return
  }

  // First callback while already visible must not load; wait for leave then re-enter.
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

function setScrollRoot(status: ContactLifecycleStatus, el: Element | null) {
  if (el instanceof HTMLElement) {
    scrollRoots.set(status, el)
  } else {
    scrollRoots.delete(status)
    disconnectObserver(status)
    wasNotIntersecting.delete(status)
  }

  observeColumn(status)
}

function setSentinel(status: ContactLifecycleStatus, el: Element | null) {
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
  toStatus: ContactLifecycleStatus,
  event: { newIndex?: number | null, item?: HTMLElement }
) {
  suppressClick.value = true
  await nextTick()

  const cardId = Number(event.item?.dataset.cardId)
  const fromStatus = event.item?.dataset.fromStatus as ContactLifecycleStatus | undefined
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
  // Sortable fires click after drag end; skip that one navigation.
  suppressClick.value = true
  window.setTimeout(() => {
    suppressClick.value = false
  }, 0)
}

function openContact(id: number) {
  if (suppressClick.value) {
    return
  }

  navigateTo(`/leasing/contacts/${id}`)
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
          {{ $t(`status.contact.${column.status}`) }}
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
          group="contact-board"
          :animation="150"
          :sort="false"
          ghost-class="opacity-40"
          chosen-class="kanban-chosen"
          @update:model-value="(cards: Array<ContactCard>) => emit('update:columnCards', column.status, cards)"
          @add="(event: { newIndex?: number | null, item?: HTMLElement }) => onAdd(column.status, event)"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <div
            v-for="card in column.cards"
            :key="card.id"
            :data-card-id="card.id"
            :data-from-status="card.status"
            role="link"
            tabindex="0"
            class="cursor-pointer rounded-md border border-default bg-default p-3 active:cursor-grabbing"
            :class="{ 'pointer-events-none opacity-60': pendingMoveIds?.includes(card.id) }"
            @click="openContact(card.id)"
            @keydown.enter="openContact(card.id)"
          >
            <div class="flex items-start gap-2.5">
              <UAvatar
                :text="formatContactInitials(card)"
                size="sm"
                class="bg-elevated text-highlighted shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ formatContactName(card) }}
                </p>
                <p
                  v-if="card.company"
                  class="mt-0.5 truncate text-xs text-dimmed"
                >
                  {{ card.company }}
                </p>
                <p
                  v-if="card.email"
                  class="mt-0.5 truncate text-xs text-dimmed"
                >
                  {{ card.email }}
                </p>
                <p
                  v-if="card.deals_count != null && card.deals_count > 0"
                  class="mt-1.5 text-xs text-muted"
                >
                  {{ $t('pages.contacts.board.dealsCount', { count: card.deals_count }) }}
                </p>
              </div>
            </div>
          </div>

          <p
            v-if="column.cards.length === 0"
            class="px-1 py-2 text-center text-xs text-dimmed"
          >
            {{ $t('pages.contacts.board.emptyColumn') }}
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
