<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type {
  ApiInboxMessage,
  ApiInboxMoveResult,
  ApiInboxMoveTarget,
  ApiInboxThreadSummary
} from '~/types/inbox'

const props = defineProps<{
  thread: ApiInboxThreadSummary | null
  messages: Array<ApiInboxMessage>
  pending: boolean
  loadingOlder: boolean
  hasOlder: boolean
  insertOptimisticMessage: (partial: {
    direction: 'outbound'
    body: ApiInboxMessage['body']
    fromAddress: string
    toAddress: string
  }) => number
  reconcileOptimisticMessage: (tempId: number, real: ApiInboxMessage | null) => void
}>()

const emit = defineEmits<{
  loadOlder: []
  assign: [employeeId: number | null]
  sent: []
  markUnread: []
  moved: [threadId: number]
}>()

const { t, locale } = useI18n()
const { get, post } = useApi()
const toast = useToast()
const { items: employeeOptions } = useEmployeesOptions()

const assigneeItems = computed(() => [
  { label: t('inbox.conversation.unassigned'), value: null },
  ...employeeOptions.value.map(option => ({ label: option.label, value: option.value }))
])

const assigneeValue = computed(() => props.thread?.assigned_employee?.id ?? null)

function onAssign(value: number | null) {
  emit('assign', value)
}

const moveOpen = ref(false)
const moveTargets = ref<Array<ApiInboxMoveTarget>>([])
const movePending = ref(false)
const moveSubmitting = ref(false)

const channelSupportsNewThread = computed(() => props.thread?.channel === 'email')

const actionItems = computed<Array<DropdownMenuItem[]>>(() => [[
  {
    label: t('inbox.conversation.actions.markUnread'),
    icon: 'i-lucide-mail-open',
    onSelect: () => emit('markUnread')
  },
  {
    label: t('inbox.conversation.actions.moveThread'),
    icon: 'i-lucide-move',
    onSelect: () => openMoveModal()
  }
]])

async function openMoveModal() {
  if (!props.thread) {
    return
  }

  moveOpen.value = true
  movePending.value = true
  try {
    const response = await get<Array<ApiInboxMoveTarget>>(
      `/api/inbox/threads/${props.thread.id}/move-targets`
    )
    moveTargets.value = response.data
  } catch {
    moveTargets.value = []
    toast.add({ title: t('inbox.move.loadError'), color: 'error' })
  } finally {
    movePending.value = false
  }
}

async function confirmMove(payload: { message_thread_id: number } | { new_thread: true }) {
  const message = [...props.messages].reverse().find(m => m.direction === 'inbound')
    ?? props.messages[props.messages.length - 1]

  if (!message || message.id < 0) {
    toast.add({ title: t('inbox.move.noMessage'), color: 'error' })
    return
  }

  moveSubmitting.value = true
  try {
    const response = await post<ApiInboxMoveResult>(
      `/api/messages/${message.id}/move-thread`,
      payload as Record<string, unknown>
    )
    moveOpen.value = false
    toast.add({ title: t('inbox.move.success'), color: 'success' })
    emit('moved', response.data.message_thread_id)
  } catch {
    toast.add({ title: t('inbox.move.error'), color: 'error' })
  } finally {
    moveSubmitting.value = false
  }
}

const counterpartAddress = computed(() => {
  if (!props.thread) {
    return ''
  }

  const last = props.messages[props.messages.length - 1]
  if (!last) {
    return props.thread.channel_key ?? ''
  }

  return last.direction === 'inbound' ? last.from_address : last.to_address
})

const channelIcon = computed(() => props.thread
  ? ({ email: 'i-lucide-mail', sms: 'i-lucide-message-square', call: 'i-lucide-phone' })[props.thread.channel]
  : null)

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

function dayLabel(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) {
    return t('inbox.conversation.today')
  }

  if (isSameDay(date, yesterday)) {
    return t('inbox.conversation.yesterday')
  }

  return date.toLocaleDateString(locale.value === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
}

const groupedMessages = computed(() => {
  const groups: Array<{ key: string, label: string, messages: Array<ApiInboxMessage> }> = []

  for (const message of props.messages) {
    const at = message.sent_at ?? message.created_at
    const key = at.slice(0, 10)
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.key === key) {
      lastGroup.messages.push(message)
    } else {
      groups.push({ key, label: dayLabel(at), messages: [message] })
    }
  }

  return groups
})

const scrollContainer = ref<HTMLElement | null>(null)
const topSentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let wasNotIntersecting = false
let pendingScrollAdjust = false

function isNearBottom(): boolean {
  const el = scrollContainer.value
  if (!el) {
    return true
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight < 160
}

function scrollToBottom() {
  const el = scrollContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

function disconnectObserver() {
  observer?.disconnect()
  observer = null
}

function observeTopSentinel() {
  disconnectObserver()

  if (!scrollContainer.value || !topSentinel.value || !props.hasOlder) {
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

      if (entry.isIntersecting && previouslyNotIntersecting && !props.loadingOlder) {
        pendingScrollAdjust = true
        emit('loadOlder')
      }
    },
    { root: scrollContainer.value, rootMargin: '80px 0px', threshold: 0 }
  )

  observer.observe(topSentinel.value)
}

watch(() => props.thread?.id, () => {
  nextTick(scrollToBottom)
})

watch(
  () => props.messages.length,
  (next, prev) => {
    nextTick(() => {
      if (pendingScrollAdjust) {
        pendingScrollAdjust = false
        observeTopSentinel()
        return
      }

      if (next > prev && isNearBottom()) {
        scrollToBottom()
      }

      observeTopSentinel()
    })
  }
)

onMounted(() => {
  nextTick(scrollToBottom)
  observeTopSentinel()
})
onBeforeUnmount(disconnectObserver)

const isCallThread = computed(() => props.thread?.channel === 'call')

const composerRef = ref<{ focus: () => void, insertSnippet: (snippet: string) => void } | null>(null)
defineExpose({
  focusComposer: () => composerRef.value?.focus(),
  insertSnippet: (snippet: string) => composerRef.value?.insertSnippet(snippet)
})
</script>

<template>
  <div class="flex min-w-0 flex-1 flex-col">
    <div
      v-if="pending"
      class="flex h-full items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="!thread"
      class="flex h-full flex-col items-center justify-center gap-2 text-center"
    >
      <UIcon
        name="i-lucide-message-square"
        class="size-8 text-dimmed"
      />
      <p class="text-sm text-dimmed">
        {{ t('inbox.empty.noSelection') }}
      </p>
    </div>

    <template v-else>
      <div class="flex shrink-0 items-center gap-3 border-b border-default px-4 py-3">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-elevated text-xs font-semibold text-dimmed">
          {{ thread.contact.avatar_initials || '—' }}
        </div>

        <div class="min-w-0 flex-1">
          <NuxtLink
            v-if="thread.contact.id"
            :to="`/leasing/contacts/${thread.contact.id}`"
            class="truncate text-sm font-semibold text-highlighted hover:underline"
          >
            {{ thread.contact.name || t('inbox.row.unknownContact') }}
          </NuxtLink>
          <span
            v-else
            class="truncate text-sm font-semibold text-highlighted"
          >
            {{ thread.contact.name || t('inbox.row.unknownContact') }}
          </span>
          <div class="flex items-center gap-1 text-xs text-dimmed">
            <UIcon
              :name="channelIcon ?? undefined"
              class="size-3"
            />
            <span class="truncate">{{ counterpartAddress }}</span>
            <UBadge
              v-if="thread.suppressed"
              :label="t('inbox.row.suppressedTooltip')"
              color="error"
              variant="subtle"
              size="xs"
            />
          </div>
        </div>

        <USelectMenu
          :model-value="assigneeValue"
          :items="assigneeItems"
          value-key="value"
          size="sm"
          class="w-40"
          :placeholder="t('inbox.conversation.unassigned')"
          @update:model-value="onAssign"
        />

        <UDropdownMenu :items="actionItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('inbox.conversation.actionsAria')"
          />
        </UDropdownMenu>
      </div>

      <div
        ref="scrollContainer"
        class="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        <div
          ref="topSentinel"
          class="h-1"
        />

        <div
          v-if="loadingOlder"
          class="flex justify-center py-2"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-4 animate-spin text-dimmed"
          />
        </div>

        <div
          v-if="groupedMessages.length === 0"
          class="flex h-full items-center justify-center text-sm text-dimmed"
        >
          {{ t('inbox.empty.noMessages') }}
        </div>

        <div
          v-for="group in groupedMessages"
          :key="group.key"
          class="mb-4"
        >
          <div class="mb-3 flex items-center justify-center">
            <span class="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] font-medium text-dimmed">
              {{ group.label }}
            </span>
          </div>

          <div class="flex flex-col gap-2.5">
            <template
              v-for="message in group.messages"
              :key="message.id"
            >
              <InboxCallMessageCard
                v-if="isCallThread"
                :message="message"
              />
              <InboxMessageBubble
                v-else
                :message="message"
              />
            </template>
          </div>
        </div>
      </div>

      <InboxComposer
        ref="composerRef"
        :thread-id="thread.id"
        :channel="thread.channel"
        :insert-optimistic-message="insertOptimisticMessage"
        :reconcile-optimistic-message="reconcileOptimisticMessage"
        @sent="emit('sent')"
      />

      <MoveThreadModal
        v-model:open="moveOpen"
        :targets="moveTargets"
        :pending="movePending"
        :submitting="moveSubmitting"
        :channel-supports-new-thread="channelSupportsNewThread"
        @confirm="confirmMove"
      />
    </template>
  </div>
</template>
