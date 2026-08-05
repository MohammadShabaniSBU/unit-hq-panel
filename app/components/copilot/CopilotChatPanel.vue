<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCopilotStore } from '~/stores/copilot'
import type { TextPart } from '~/types/copilot'

const { t } = useI18n()
const store = useCopilotStore()
const inputValue = ref('')
const rejectReason = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const conversationId = computed(() => store.activeConversationId)
useCopilotStream(conversationId)

const isEmpty = computed(() => store.activeMessages.length === 0 && !store.isBusy)

const suggestions = computed(() => [
  { label: t('copilot.suggestions.findContacts'), icon: 'i-lucide-users', prompt: t('copilot.suggestions.findContactsPrompt') },
  { label: t('copilot.suggestions.createDeal'), icon: 'i-lucide-handshake', prompt: t('copilot.suggestions.createDealPrompt') },
  { label: t('copilot.suggestions.addContact'), icon: 'i-lucide-user-plus', prompt: t('copilot.suggestions.addContactPrompt') },
  { label: t('copilot.suggestions.recentDeals'), icon: 'i-lucide-bar-chart-2', prompt: t('copilot.suggestions.recentDealsPrompt') }
])

const handleSendMessage = () => {
  if (inputValue.value.trim()) {
    store.sendMessage(inputValue.value)
    inputValue.value = ''
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSendMessage()
  }
}

const useSuggestion = (prompt: string) => {
  inputValue.value = prompt
}

function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string
  return import.meta.client ? DOMPurify.sanitize(html) : html
}

const lastAssistantHasContent = computed(() => {
  const msgs = store.activeMessages
  const last = msgs[msgs.length - 1]
  return last?.role === 'assistant' && last.parts.some(p => p.type === 'text' && p.text.length > 0)
})

function toolLabel(toolName: string): string {
  const key = `copilot.tools.${toolName}`
  const label = t(key)
  return label === key ? toolName : label
}

function argumentEntries(args: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(args)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([label, value]) => [label, typeof value === 'object' ? JSON.stringify(value) : String(value)])
}

const streamErrorMessage = computed(() => {
  if (!store.streamError) return null
  const translated = t(store.streamError)
  return translated === store.streamError ? t('copilot.stream.failed') : translated
})

watch(
  () => store.activeMessages,
  () => {
    nextTick(() => {
      if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight
      }
    })
  },
  { deep: true }
)

watch(
  () => store.pendingApprovals,
  () => {
    rejectReason.value = ''
  }
)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Empty state: centered layout -->
    <template v-if="isEmpty">
      <div class="flex items-center justify-between px-4 py-3 shrink-0">
        <span />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="store.close()"
        />
      </div>

      <div class="flex-1 flex flex-col items-center justify-center px-6 gap-5 pb-8">
        <div class="text-center flex flex-col items-center gap-2">
          <UIcon name="i-lucide-bot" class="size-9 text-primary" />
          <h2 class="text-xl font-semibold tracking-tight">
            {{ $t('copilot.title') }}
          </h2>
        </div>

        <form
          class="w-full max-w-lg"
          @submit.prevent="handleSendMessage"
        >
          <div class="rounded-2xl border border-default bg-elevated shadow-sm px-4 pt-3 pb-2 flex flex-col gap-2">
            <UTextarea
              v-model="inputValue"
              :placeholder="$t('copilot.placeholder')"
              :rows="2"
              autoresize
              variant="none"
              class="w-full resize-none text-sm"
              @keydown="handleKeyDown"
            />
            <div class="flex items-center justify-end">
              <UButton
                type="submit"
                icon="i-lucide-arrow-up"
                color="primary"
                size="xs"
                :disabled="!inputValue.trim()"
              />
            </div>
          </div>
          <p class="text-center text-xs text-muted mt-2">
            {{ $t('copilot.disclaimer') }}
          </p>
        </form>

        <div class="flex flex-wrap gap-2 justify-center">
          <UButton
            v-for="s in suggestions"
            :key="s.label"
            size="sm"
            color="neutral"
            variant="soft"
            :icon="s.icon"
            @click="useSuggestion(s.prompt)"
          >
            {{ s.label }}
          </UButton>
        </div>
      </div>
    </template>

    <!-- Chat mode: header + messages + input -->
    <template v-else>
      <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
        <h3 class="font-semibold text-sm truncate">
          {{ store.activeConversation?.title ?? $t('copilot.conversations.chat') }}
        </h3>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="store.close()"
        />
      </div>

      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-4 py-3 space-y-4"
      >
        <template
          v-for="message in store.activeMessages"
          :key="message.id"
        >
          <div
            v-if="message.role === 'user'"
            class="flex justify-end"
          >
            <div class="max-w-[75%] rounded-2xl bg-primary text-white px-4 py-2 text-sm whitespace-pre-wrap break-words">
              {{ (message.parts[0] as TextPart | undefined)?.text ?? '' }}
            </div>
          </div>

          <div
            v-else
            class="flex items-start gap-2"
          >
            <UIcon
              name="i-lucide-bot"
              class="shrink-0 mt-1 text-muted"
            />
            <div class="flex flex-col gap-2 max-w-[75%]">
              <template
                v-for="(part, pIdx) in message.parts"
                :key="pIdx"
              >
                <div
                  v-if="part.type === 'text' && part.text"
                  class="prose prose-sm dark:prose-invert text-sm break-words"
                  v-html="renderMarkdown(part.text)"
                />

                <div
                  v-else-if="part.type === 'tool-call' && part.status === 'calling'"
                  class="flex items-center gap-1.5 text-xs text-muted py-1"
                >
                  <UIcon name="i-lucide-loader-circle" class="animate-spin size-3.5" />
                  {{ toolLabel(part.toolName) }}...
                </div>

                <NuxtLink
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateContact'"
                  :to="`/leasing/contacts/${part.result?.contact_id}`"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UIcon name="i-lucide-user" class="text-primary shrink-0" />
                  <div>
                    <p class="font-medium">{{ part.result?.contact_name }}</p>
                    <p class="text-xs text-muted">{{ $t('copilot.results.contactCreated') }}</p>
                  </div>
                </NuxtLink>

                <NuxtLink
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateDeal'"
                  :to="`/leasing/deals/${part.result?.deal_id}`"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UIcon name="i-lucide-handshake" class="text-primary shrink-0" />
                  <div>
                    <p class="font-medium">{{ $t('copilot.results.dealFor', { name: part.result?.contact_name }) }}</p>
                    <p class="text-xs text-muted">{{ $t('copilot.results.dealCreated') }}</p>
                  </div>
                </NuxtLink>
              </template>
            </div>
          </div>
        </template>

        <div
          v-for="approval in store.pendingApprovals"
          :key="approval.id"
          class="rounded-xl border border-default bg-elevated px-3 py-3 text-sm space-y-3"
        >
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-shield-check" class="text-primary shrink-0 mt-0.5" />
            <div class="min-w-0">
              <p class="font-medium">
                {{ approval.reason || toolLabel(approval.tool) }}
              </p>
              <p class="text-xs text-muted mt-0.5">
                {{ $t('copilot.approvals.review') }}
              </p>
            </div>
          </div>

          <dl
            v-if="argumentEntries(approval.arguments).length"
            class="space-y-1.5 border-t border-default pt-2"
          >
            <div
              v-for="([label, value], fieldIdx) in argumentEntries(approval.arguments)"
              :key="fieldIdx"
              class="flex gap-2 text-xs"
            >
              <dt class="text-muted shrink-0 min-w-24">
                {{ label }}
              </dt>
              <dd class="font-medium break-words">
                {{ value }}
              </dd>
            </div>
          </dl>

          <UTextarea
            v-model="rejectReason"
            :placeholder="$t('copilot.approvals.rejectReasonPlaceholder')"
            :rows="1"
            autoresize
            variant="soft"
            class="w-full text-xs"
          />

          <div class="flex gap-2 pt-1">
            <UButton
              size="xs"
              color="primary"
              icon="i-lucide-check"
              @click="store.approvePending(approval.id)"
            >
              {{ $t('copilot.approvals.approve') }}
            </UButton>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-x"
              @click="store.rejectPending(approval.id, rejectReason.trim() || undefined)"
            >
              {{ $t('copilot.approvals.reject') }}
            </UButton>
          </div>
        </div>

        <div
          v-if="streamErrorMessage"
          class="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
        >
          {{ streamErrorMessage }}
        </div>

        <div
          v-if="store.isBusy && !lastAssistantHasContent && store.pendingApprovals.length === 0"
          class="flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-bot"
            class="shrink-0 mt-1 text-muted"
          />
          <div class="flex gap-1 py-2">
            <span class="size-2 rounded-full bg-muted animate-bounce [animation-delay:0ms]" />
            <span class="size-2 rounded-full bg-muted animate-bounce [animation-delay:150ms]" />
            <span class="size-2 rounded-full bg-muted animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-default bg-default shrink-0">
        <form
          @submit.prevent="handleSendMessage"
        >
          <div class="rounded-2xl border border-default bg-elevated px-4 pt-3 pb-2 flex flex-col gap-2">
            <UTextarea
              v-model="inputValue"
              :placeholder="$t('copilot.placeholder')"
              :rows="1"
              autoresize
              variant="none"
              :disabled="store.isBusy"
              class="w-full resize-none text-sm"
              @keydown="handleKeyDown"
            />
            <div class="flex items-center justify-end">
              <UButton
                type="submit"
                icon="i-lucide-arrow-up"
                color="primary"
                size="xs"
                :disabled="!inputValue.trim() || store.isBusy"
              />
            </div>
          </div>
          <p class="text-center text-xs text-muted mt-2">
            {{ $t('copilot.disclaimer') }}
          </p>
        </form>
      </div>
    </template>
  </div>
</template>
