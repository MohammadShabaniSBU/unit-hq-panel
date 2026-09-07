<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type {
  ApiCommsTriageSummary,
  ApiInboxThreadSummary,
  InboxChannel,
  InboxChannelTab,
  InboxFilter,
  InboxListMode
} from '~/types/inbox'

const props = defineProps<{
  listMode: InboxListMode
  threads: Array<ApiInboxThreadSummary>
  triageItems: Array<ApiCommsTriageSummary>
  pending: boolean
  loadingMore: boolean
  hasMore: boolean
  newArrivalsCount: number
  selectedThreadId: number | null
  selectedTriageId: number | null
  channel: InboxChannelTab
  filter: InboxFilter
  unreadOnly: boolean
  searchQuery: string
  channelDots: Record<InboxChannel, boolean>
  triageCount: number
}>()

const emit = defineEmits<{
  'update:listMode': [value: InboxListMode]
  'update:channel': [value: InboxChannelTab]
  'update:filter': [value: InboxFilter]
  'update:unreadOnly': [value: boolean]
  'update:searchQuery': [value: string]
  'select': [id: number]
  'selectTriage': [id: number]
  'loadMore': []
  'revealNewArrivals': []
}>()

const { t } = useI18n()

const channelTabs: Array<{ key: InboxChannelTab, label: string, dot?: string }> = [
  { key: 'all', label: 'inbox.channels.all' },
  { key: 'email', label: 'inbox.channels.email', dot: 'bg-[#3B82F6]' },
  { key: 'sms', label: 'inbox.channels.sms', dot: 'bg-[#10B981]' },
  { key: 'whatsapp', label: 'inbox.channels.whatsapp', dot: 'bg-[#25D366]' },
  { key: 'call', label: 'inbox.channels.call', dot: 'bg-[#F59E0B]' }
]

function modePillClass(active: boolean) {
  return active
    ? 'rounded-full px-3.5 py-1 text-xs font-medium bg-neutral-950 text-white'
    : 'rounded-full px-3.5 py-1 text-xs font-medium text-muted hover:bg-elevated'
}

const filterTabs: Array<{ key: InboxFilter, label: string }> = [
  { key: 'mine', label: 'inbox.filters.mine' },
  { key: 'unassigned', label: 'inbox.filters.unassigned' },
  { key: 'all', label: 'inbox.filters.all' }
]

function hasDot(key: InboxChannelTab): boolean {
  return key !== 'all' && props.channelDots[key as InboxChannel]
}

const searchInput = ref(props.searchQuery)
watch(() => props.searchQuery, (value) => {
  if (value !== searchInput.value) {
    searchInput.value = value
  }
})

const emitSearch = useDebounceFn((value: string) => emit('update:searchQuery', value), 300)
watch(searchInput, value => emitSearch(value))

const scrollRoot = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let wasNotIntersecting = false

function disconnectObserver() {
  observer?.disconnect()
  observer = null
}

function observeSentinel() {
  disconnectObserver()

  if (!scrollRoot.value || !sentinel.value || !props.hasMore) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      const previouslyNotIntersecting = wasNotIntersecting
      wasNotIntersecting = !entry.isIntersecting

      if (entry.isIntersecting && previouslyNotIntersecting && !props.loadingMore) {
        emit('loadMore')
      }
    },
    { root: scrollRoot.value, rootMargin: '80px 0px', threshold: 0 }
  )

  observer.observe(sentinel.value)
}

const listLength = computed(() =>
  props.listMode === 'triage' ? props.triageItems.length : props.threads.length
)

watch([() => props.hasMore, listLength, () => props.listMode], observeSentinel)
onMounted(observeSentinel)
onBeforeUnmount(disconnectObserver)

const isTriage = computed(() => props.listMode === 'triage')
const emptyLabel = computed(() =>
  isTriage.value ? t('inbox.triage.empty') : t('inbox.empty.threads')
)
</script>

<template>
  <div class="flex h-full w-80 shrink-0 flex-col border-r border-default bg-default">
    <div class="flex shrink-0 flex-col gap-3.5 px-4 pt-3.5">
      <div class="flex items-center gap-2">
        <button
          type="button"
          :class="modePillClass(!isTriage)"
          @click="emit('update:listMode', 'threads')"
        >
          {{ t('inbox.listMode.threads') }}
        </button>
        <button
          type="button"
          :class="modePillClass(isTriage)"
          @click="emit('update:listMode', 'triage')"
        >
          <span class="flex items-center gap-1.5">
            {{ t('inbox.listMode.triage') }}
            <span
              v-if="triageCount > 0"
              class="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-semibold text-white"
            >
              {{ triageCount }}
            </span>
          </span>
        </button>
      </div>

      <template v-if="!isTriage">
        <div class="flex flex-wrap items-center gap-x-1 gap-y-1.5">
          <button
            v-for="tab in channelTabs"
            :key="tab.key"
            type="button"
            :class="modePillClass(channel === tab.key)"
            @click="emit('update:channel', tab.key)"
          >
            <span class="flex items-center gap-1.5">
              <span
                v-if="tab.dot"
                class="size-1.5 rounded-full"
                :class="tab.dot"
              />
              {{ t(tab.label) }}
              <span
                v-if="hasDot(tab.key)"
                class="size-1.5 rounded-full bg-primary"
              />
            </span>
          </button>
        </div>

        <div class="flex items-center gap-4">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            type="button"
            class="pb-1.5 text-xs"
            :class="filter === tab.key
              ? 'border-b-2 border-primary font-medium text-highlighted'
              : 'border-b-2 border-transparent text-muted'"
            @click="emit('update:filter', tab.key)"
          >
            {{ t(tab.label) }}
          </button>
        </div>

        <div class="mb-1 flex items-center gap-2.5">
          <UInput
            v-model="searchInput"
            icon="i-lucide-search"
            size="md"
            class="flex-1"
            :placeholder="t('inbox.search.placeholder')"
          />
          <UTooltip :text="t('inbox.unreadOnly')">
            <USwitch
              :model-value="unreadOnly"
              size="md"
              @update:model-value="emit('update:unreadOnly', $event)"
            />
          </UTooltip>
        </div>
      </template>

      <p
        v-else
        class="text-xs text-dimmed"
      >
        {{ t('inbox.triage.tabHint') }}
      </p>
    </div>

    <div class="relative min-h-0 flex-1">
      <Transition name="fade">
        <div
          v-if="!isTriage && newArrivalsCount > 0"
          class="absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
        >
          <UButton
            :label="t('inbox.newArrivals', { count: newArrivalsCount })"
            color="primary"
            variant="solid"
            size="xs"
            class="rounded-full shadow-md"
            icon="i-lucide-arrow-up"
            @click="emit('revealNewArrivals')"
          />
        </div>
      </Transition>

      <div
        ref="scrollRoot"
        class="h-full overflow-y-auto px-3 pb-3"
      >
        <div
          v-if="pending"
          class="flex items-center justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-5 animate-spin text-dimmed"
          />
        </div>

        <div
          v-else-if="listLength === 0"
          class="flex flex-col items-center gap-2 px-4 py-16 text-center"
        >
          <UIcon
            :name="isTriage ? 'i-lucide-circle-check' : 'i-lucide-inbox'"
            class="size-8 text-dimmed"
          />
          <p class="text-sm text-dimmed">
            {{ emptyLabel }}
          </p>
          <p
            v-if="isTriage"
            class="text-xs text-dimmed"
          >
            {{ t('inbox.triage.emptyHelp') }}
          </p>
        </div>

        <template v-else-if="isTriage">
          <InboxTriageListRow
            v-for="item in triageItems"
            :key="item.id"
            :item="item"
            :active="item.id === selectedTriageId"
            @select="emit('selectTriage', $event)"
          />

          <div
            ref="sentinel"
            class="h-1"
          />

          <div
            v-if="loadingMore"
            class="flex items-center justify-center py-3"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-dimmed"
            />
          </div>
        </template>

        <template v-else>
          <InboxThreadListRow
            v-for="thread in threads"
            :key="thread.id"
            :thread="thread"
            :active="thread.id === selectedThreadId"
            @select="emit('select', $event)"
          />

          <div
            ref="sentinel"
            class="h-1"
          />

          <div
            v-if="loadingMore"
            class="flex items-center justify-center py-3"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-4 animate-spin text-dimmed"
            />
          </div>
        </template>
      </div>
    </div>

    <div class="shrink-0 border-t border-default px-3 py-1.5 text-center text-[11px] text-dimmed">
      {{ t('inbox.keyboard.hint') }}
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
