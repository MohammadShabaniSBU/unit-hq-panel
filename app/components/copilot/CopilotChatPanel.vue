<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCopilotStore } from '~/stores/copilot'
import type { TextPart } from '~/stores/copilot'

const store = useCopilotStore()
const inputValue = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const isEmpty = computed(() => store.activeMessages.length === 0 && !store.isBusy)

const suggestions = [
  { label: 'Find contacts', icon: 'i-lucide-users', prompt: 'Show me my recent contacts' },
  { label: 'Create a deal', icon: 'i-lucide-handshake', prompt: 'Create a new deal' },
  { label: 'Add contact', icon: 'i-lucide-user-plus', prompt: 'Add a new contact' },
  { label: 'Recent deals', icon: 'i-lucide-bar-chart-2', prompt: 'What are my recent deals?' },
]

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
  const labels: Record<string, string> = {
    CreateContact: 'Creating contact',
    CreateDeal: 'Creating deal',
    GetContacts: 'Looking up contacts',
    GetDeals: 'Looking up deals',
  }
  return labels[toolName] ?? toolName
}

watch(
  () => store.activeMessages,
  () => {
    nextTick(() => {
      if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight
      }
    })
  },
  { deep: true },
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
            Unit Master
          </h2>
        </div>

        <form
          class="w-full max-w-lg"
          @submit.prevent="handleSendMessage"
        >
          <div class="rounded-2xl border border-default bg-elevated shadow-sm px-4 pt-3 pb-2 flex flex-col gap-2">
            <UTextarea
              v-model="inputValue"
              placeholder="Ask Unit Master anything..."
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
            Unit Master can make mistakes. Double-check important info.
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
          {{ store.activeConversation?.title ?? 'Chat' }}
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
                <!-- text part -->
                <div
                  v-if="part.type === 'text' && part.text"
                  class="prose prose-sm dark:prose-invert text-sm break-words"
                  v-html="renderMarkdown(part.text)"
                />

                <!-- tool-call: calling state -->
                <div
                  v-else-if="part.type === 'tool-call' && part.status === 'calling'"
                  class="flex items-center gap-1.5 text-xs text-muted py-1"
                >
                  <UIcon name="i-lucide-loader-circle" class="animate-spin size-3.5" />
                  {{ toolLabel(part.toolName) }}...
                </div>

                <!-- tool-call: done — contact card -->
                <NuxtLink
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateContact'"
                  :to="`/leasing/contacts/${part.result?.contact_id}`"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UIcon name="i-lucide-user" class="text-primary shrink-0" />
                  <div>
                    <p class="font-medium">{{ part.result?.contact_name }}</p>
                    <p class="text-xs text-muted">Contact created · View →</p>
                  </div>
                </NuxtLink>

                <!-- tool-call: done — deal card -->
                <NuxtLink
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateDeal'"
                  :to="`/leasing/deals/${part.result?.deal_id}`"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UIcon name="i-lucide-handshake" class="text-primary shrink-0" />
                  <div>
                    <p class="font-medium">Deal for {{ part.result?.contact_name }}</p>
                    <p class="text-xs text-muted">Deal created · View →</p>
                  </div>
                </NuxtLink>
              </template>
            </div>
          </div>
        </template>

        <div
          v-if="store.isBusy && !lastAssistantHasContent"
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
              placeholder="Ask Unit Master anything..."
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
            Unit Master can make mistakes. Double-check important info.
          </p>
        </form>
      </div>
    </template>
  </div>
</template>
