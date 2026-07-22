<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { ContractStatus } from '~/types/contract'
import type { ContractBoardColumn, ContractCard } from '~/types/contract-board'
import { contractStatusColor } from '~/composables/useContractsList'

const props = defineProps<{
  columns: Array<ContractBoardColumn>
  columnLoading: Partial<Record<ContractStatus, boolean>>
  pendingMoveIds?: Array<number>
}>()

const emit = defineEmits<{
  'loadMore': [status: ContractStatus]
  'move': [payload: {
    cardId: number
    fromStatus: ContractStatus
    toStatus: ContractStatus
    toIndex: number
  }]
  'update:columnCards': [status: ContractStatus, cards: Array<ContractCard>]
}>()

const { t } = useI18n()
const router = useRouter()

const suppressClick = ref(false)
const scrollRoots = new Map<ContractStatus, HTMLElement>()
const sentinels = new Map<ContractStatus, HTMLElement>()
const observers = new Map<ContractStatus, IntersectionObserver>()
/** Edge-trigger: only load when sentinel transitions false → true */
const wasNotIntersecting = new Map<ContractStatus, boolean>()

function disconnectObserver(status: ContractStatus) {
  observers.get(status)?.disconnect()
  observers.delete(status)
}

function observeColumn(status: ContractStatus) {
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

function setScrollRoot(status: ContractStatus, el: Element | null) {
  if (el instanceof HTMLElement) {
    scrollRoots.set(status, el)
  } else {
    scrollRoots.delete(status)
    disconnectObserver(status)
    wasNotIntersecting.delete(status)
  }

  observeColumn(status)
}

function setSentinel(status: ContractStatus, el: Element | null) {
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
  toStatus: ContractStatus,
  event: { newIndex?: number | null, item?: HTMLElement }
) {
  suppressClick.value = true
  await nextTick()

  const cardId = Number(event.item?.dataset.cardId)
  const fromStatus = event.item?.dataset.fromStatus as ContractStatus | undefined
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

function openContract(id: number) {
  if (suppressClick.value) {
    return
  }

  navigateTo(`/leasing/contracts/${id}`)
}

function openDeal(event: Event, dealId: number) {
  event.stopPropagation()
  router.push(`/leasing/deals/${dealId}`)
}

function contactInitials(card: ContractCard): string {
  const name = card.contact?.name?.trim()
  if (!name) {
    return `#${card.id}`
  }

  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }

  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}

function contactName(card: ContractCard): string {
  return card.contact?.name?.trim() || t('pages.contracts.board.untitled', { id: card.id })
}

function unitLabel(card: ContractCard): string {
  const unit = card.unit
  if (!unit) {
    return t('common.emptyValue')
  }

  return unit.site
    ? `${unit.unit_number} · ${unit.site.name}`
    : unit.unit_number
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
          {{ $t(`contractStatus.${column.status}`) }}
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
          group="contract-board"
          :animation="150"
          :sort="false"
          ghost-class="opacity-40"
          chosen-class="ring-2 ring-primary ring-offset-1"
          @update:model-value="(cards: Array<ContractCard>) => emit('update:columnCards', column.status, cards)"
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
            @click="openContract(card.id)"
            @keydown.enter="openContract(card.id)"
          >
            <div class="flex items-start gap-2.5">
              <UAvatar
                :text="contactInitials(card)"
                size="sm"
                class="bg-elevated text-highlighted shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ contactName(card) }}
                </p>
                <p class="mt-0.5 truncate text-xs text-dimmed">
                  {{ unitLabel(card) }}
                </p>
                <button
                  v-if="card.deal_id"
                  type="button"
                  class="mt-0.5 truncate text-xs text-dimmed hover:text-highlighted"
                  @click="openDeal($event, card.deal_id)"
                >
                  {{ $t('pages.contracts.board.dealLabel', { id: card.deal_id }) }}
                </button>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <UBadge
                    :label="$t(`contractStatus.${card.status}`)"
                    :color="contractStatusColor(card.status)"
                    variant="subtle"
                    size="sm"
                  />
                </div>
                <p
                  v-if="card.start_date"
                  class="mt-1.5 text-xs text-muted"
                >
                  {{ $t('pages.contracts.board.starts', { date: card.start_date }) }}
                </p>
              </div>
            </div>
          </div>

          <p
            v-if="column.cards.length === 0"
            class="px-1 py-2 text-center text-xs text-dimmed"
          >
            {{ $t('pages.contracts.board.emptyColumn') }}
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
