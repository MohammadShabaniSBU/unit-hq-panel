<script setup lang="ts">
import { ASSIST_MAX_PROMPT_CHARS } from '~/types/template-assist'
import type { AssistMessage, AssistTurnSummary } from '~/types/template-assist'

const props = defineProps<{
  messages: Array<AssistMessage>
  turns: Array<AssistTurnSummary>
  streamingText: string
  working: boolean
  running: boolean
  errorKey: string | null
  undoTurnId: number | null
  showChangesTurnId: number | null
  selectionLabel?: string | null
}>()

const emit = defineEmits<{
  'send': [message: string]
  'stop': []
  'new-chat': []
  'undo': [turnId: number]
  'show-changes': []
  'reload': []
  'clear-selection': []
}>()

const draft = ref('')
const transcriptEl = ref<HTMLElement | null>(null)

const showCounter = computed(() => draft.value.length >= ASSIST_MAX_PROMPT_CHARS - 400)

const transcript = computed(() => {
  const items: Array<{
    id: string
    role: string
    content: string
    turn: AssistTurnSummary | null
  }> = []
  let turnIndex = 0
  for (const message of props.messages) {
    const isAssistant = message.role === 'assistant'
    const turn = isAssistant ? (props.turns[turnIndex] ?? null) : null
    if (isAssistant) turnIndex += 1
    items.push({
      id: String(message.id),
      role: message.role,
      content: message.content ?? '',
      turn
    })
  }
  if (props.streamingText) {
    items.push({
      id: 'streaming',
      role: 'assistant',
      content: props.streamingText,
      turn: null
    })
  }
  return items
})

const isEmpty = computed(() => transcript.value.length === 0 && !props.working)

function errorText(key: string | null): string | null {
  if (!key) return null
  if (key === 'assist.daily_limit_reached') return 'templates.builder.assistant.dailyLimit'
  if (key === 'assist.draft_changed') return 'templates.builder.assistant.draftChanged'
  if (key === 'assist.tool_budget_exhausted') return 'templates.builder.assistant.budget'
  return 'templates.builder.assistant.providerError'
}

function submit() {
  const message = draft.value.trim()
  if (!message || props.running || message.length > ASSIST_MAX_PROMPT_CHARS) return
  emit('send', message)
  draft.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  submit()
}

watch(
  () => [props.messages.length, props.streamingText, props.working],
  async () => {
    await nextTick()
    const el = transcriptEl.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  }
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      v-if="errorKey"
      class="mb-3 shrink-0 rounded-md border border-error/30 bg-error/10 p-2 text-xs text-error"
    >
      <p>{{ $t(errorText(errorKey)!) }}</p>
      <UButton
        v-if="errorKey === 'assist.draft_changed'"
        class="mt-2"
        size="xs"
        color="neutral"
        variant="outline"
        :label="$t('templates.builder.assistant.reload')"
        @click="emit('reload')"
      />
    </div>

    <div
      v-if="isEmpty"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-1 pb-2"
    >
      <div class="flex flex-col items-center gap-2 text-center">
        <CopilotKolbeGreetingMark />
        <p class="text-sm font-semibold tracking-tight">
          {{ $t('templates.builder.assistant.empty') }}
        </p>
      </div>
      <form
        class="w-full"
        @submit.prevent="submit"
      >
        <div class="flex flex-col gap-2 rounded-lg border border-default bg-elevated px-3 pt-2 pb-2 shadow-sm">
          <div
            v-if="selectionLabel"
            class="flex items-center gap-1"
          >
            <span class="min-w-0 flex-1 truncate text-xs text-muted">
              {{ selectionLabel }}
            </span>
            <UButton
              icon="i-lucide-x"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="$t('templates.builder.assistant.removeSelection')"
              @click="emit('clear-selection')"
            />
          </div>
          <textarea
            v-model="draft"
            data-assist-composer
            rows="2"
            class="w-full resize-none bg-transparent text-sm outline-none"
            :placeholder="$t('templates.builder.assistant.placeholder')"
            :maxlength="ASSIST_MAX_PROMPT_CHARS"
            @keydown="onKeydown"
          />
          <div class="flex items-center justify-end gap-2">
            <span
              v-if="showCounter"
              class="mr-auto text-xs text-dimmed"
            >
              {{ $t('templates.builder.assistant.chars', { count: draft.length, max: ASSIST_MAX_PROMPT_CHARS }) }}
            </span>
            <UButton
              type="submit"
              icon="i-lucide-arrow-up"
              color="primary"
              size="xs"
              :aria-label="$t('templates.builder.assistant.send')"
              :disabled="draft.trim().length === 0 || running"
            />
          </div>
        </div>
      </form>
    </div>

    <template v-else>
      <div class="mb-3 flex shrink-0 items-center justify-between gap-2">
        <p class="text-sm font-medium">
          {{ $t('templates.builder.assistant.tab') }}
        </p>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :label="$t('templates.builder.assistant.newChat')"
          @click="emit('new-chat')"
        />
      </div>

      <div
        ref="transcriptEl"
        class="min-h-0 flex-1 space-y-3 overflow-y-auto"
      >
        <div
          v-for="item in transcript"
          :key="item.id"
          class="flex flex-col gap-1"
        >
          <p class="text-[11px] font-medium tracking-wide text-dimmed uppercase">
            {{ item.role === 'user'
              ? $t('templates.builder.assistant.you')
              : $t('templates.builder.assistant.assistant') }}
          </p>
          <EmailBuilderAssistantMessage
            :text="item.content"
            :markdown="item.role === 'assistant'"
          />
          <EmailBuilderAssistantChangeCard
            v-if="item.turn && (item.turn.status === 'applied' || item.turn.status === 'undone')"
            :summary="item.turn.op_summary"
            :subject-change="item.turn.subject_change"
            :can-undo="undoTurnId === item.turn.id && item.turn.status === 'applied'"
            :can-show-changes="showChangesTurnId === item.turn.id"
            @undo="emit('undo', item.turn.id)"
            @show-changes="emit('show-changes')"
          />
        </div>
        <p
          v-if="working"
          class="text-sm text-dimmed"
        >
          {{ $t('templates.builder.assistant.working') }}
        </p>
      </div>

      <form
        class="mt-3 flex shrink-0 flex-col gap-2"
        @submit.prevent="submit"
      >
        <div
          v-if="selectionLabel"
          class="flex items-center gap-1"
        >
          <span class="min-w-0 flex-1 truncate rounded-md bg-elevated px-2 py-1 text-xs text-muted">
            {{ selectionLabel }}
          </span>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            :aria-label="$t('templates.builder.assistant.removeSelection')"
            @click="emit('clear-selection')"
          />
        </div>
        <textarea
          v-model="draft"
          data-assist-composer
          rows="3"
          class="w-full resize-none rounded-md border border-default bg-default px-2 py-1.5 text-sm outline-none focus:border-primary"
          :placeholder="$t('templates.builder.assistant.placeholder')"
          :maxlength="ASSIST_MAX_PROMPT_CHARS"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between gap-2">
          <span
            v-if="showCounter"
            class="text-xs text-dimmed"
          >
            {{ $t('templates.builder.assistant.chars', { count: draft.length, max: ASSIST_MAX_PROMPT_CHARS }) }}
          </span>
          <span v-else />
          <UButton
            v-if="running"
            size="xs"
            color="neutral"
            variant="outline"
            icon="i-lucide-square"
            :label="$t('templates.builder.assistant.stop')"
            @click="emit('stop')"
          />
          <UButton
            v-else
            type="submit"
            size="xs"
            icon="i-lucide-send"
            :label="$t('templates.builder.assistant.send')"
            :disabled="draft.trim().length === 0"
          />
        </div>
      </form>
    </template>
  </div>
</template>
