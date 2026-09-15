<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useCopilotStore } from '~/stores/copilot'
import type { ApiContact } from '~/types/contact'
import type { TextPart, ToolCallPart } from '~/types/copilot'
import { DEAL_STATUSES, STAY_PERIODS } from '~/types/deal'
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const store = useCopilotStore()
const { can } = usePermissions()
const {
  uiStatus: voiceStatus,
  lastError: voiceError,
  lastHeardQuery,
  waitingForCopilot,
  toggle: toggleVoice
} = useVocalBridgeCopilot()
const canUseVoice = computed(() => can(Permission.CopilotVoiceUse))
const inputValue = ref('')
const rejectReasons = ref<Record<string, string>>({})
const messagesEl = ref<HTMLElement | null>(null)

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
  const html = marked.parse(text, { async: false, gfm: true, breaks: true }) as string
  return import.meta.client ? DOMPurify.sanitize(html) : html
}

const INTERNAL_TOOLS = new Set(['FetchObjects', 'ResolveCalendar'])

const lastAssistantHasContent = computed(() => {
  const msgs = store.activeMessages
  const last = msgs[msgs.length - 1]
  return last?.role === 'assistant' && last.parts.some(p => p.type === 'text' && p.text.length > 0)
})

const { items: siteItems } = useOptions('/api/sites/options')
const { items: unitClassItems } = useOptions('/api/unit-classes/options')
const contactNames = ref<Record<number, string>>({})

function isInternalTool(toolName: string): boolean {
  return INTERNAL_TOOLS.has(toolName)
}

function isPendingApprovalTool(toolName: string): boolean {
  return store.pendingApprovals.some(approval => approval.tool === toolName)
}

function isVisibleToolPart(part: TextPart | ToolCallPart): boolean {
  if (part.type !== 'tool-call') return true
  if (isInternalTool(part.toolName)) return false
  if (part.status === 'calling' && isPendingApprovalTool(part.toolName)) return false
  if (part.status === 'done') {
    if (part.toolName === 'CreateContact') return part.result?.contact_id != null
    if (part.toolName === 'CreateDeal') return part.result?.deal_id != null
    if (!part.result && isPendingApprovalTool(part.toolName)) return false
  }
  return true
}

const hasVisibleToolSpinner = computed(() =>
  store.activeMessages.some(message =>
    message.parts.some(part =>
      part.type === 'tool-call'
      && part.status === 'calling'
      && isVisibleToolPart(part)
    )
  )
)

function toolLabel(toolName: string): string {
  const key = `copilot.tools.${toolName}`
  const label = t(key)
  return label === key ? toolName : label
}

function fieldLabel(key: string): string {
  const i18nKey = `copilot.approvals.fields.${key}`
  const label = t(i18nKey)
  return label === i18nKey ? key : label
}

function contactNameFromHistory(id: number): string | undefined {
  for (const message of store.activeMessages) {
    for (const part of message.parts) {
      if (part.type !== 'tool-call' || part.toolName !== 'CreateContact' || !part.result) continue
      if (Number(part.result.contact_id) === id && typeof part.result.contact_name === 'string') {
        return part.result.contact_name
      }
    }
  }
  return undefined
}

function fieldValue(key: string, value: unknown): string {
  if (key === 'site_id') {
    const id = Number(value)
    const site = siteItems.value.find(item => item.value === id)
    if (site) {
      return site.label
    }
  }
  if (key === 'contact_id') {
    const id = Number(value)
    if (id > 0) {
      const name = contactNames.value[id] ?? contactNameFromHistory(id)
      if (name) {
        return name
      }
    }
  }
  if (key === 'desired_unit_class_id') {
    const id = Number(value)
    const unitClass = unitClassItems.value.find(item => item.value === id)
    if (unitClass) {
      return unitClass.label
    }
  }
  if (key === 'status' && typeof value === 'string' && (DEAL_STATUSES as Array<string>).includes(value)) {
    return t(`dealStatus.${value}`)
  }
  if (key === 'expected_stay_period' && typeof value === 'string' && (STAY_PERIODS as Array<string>).includes(value)) {
    return t(`stayPeriod.${value}`)
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  return String(value)
}

function argumentEntries(args: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(args)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => [fieldLabel(key), fieldValue(key, value)])
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
  (approvals) => {
    rejectReasons.value = {}

    const ids = new Set<number>()
    for (const approval of approvals) {
      const raw = approval.arguments.contact_id
      if (raw === null || raw === undefined || raw === '') continue
      const id = Number(raw)
      if (id > 0 && !contactNames.value[id] && !contactNameFromHistory(id)) {
        ids.add(id)
      }
    }
    if (ids.size === 0) return

    const { get } = useApi()
    void Promise.all([...ids].map(async (id) => {
      try {
        const res = await get<ApiContact>(`/api/contacts/${id}`)
        contactNames.value = {
          ...contactNames.value,
          [id]: `${res.data.first_name} ${res.data.last_name}`.trim()
        }
      } catch {
        // Leave unresolved; fieldValue falls back to the numeric id.
      }
    }))
  }
)

function isDecided(id: string): boolean {
  return id in store.decidedApprovals
}

function decidedAction(id: string): 'approve' | 'reject' | null {
  return store.decidedApprovals[id]?.action ?? null
}
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
          <div class="rounded-lg border border-default bg-elevated shadow-sm px-4 pt-3 pb-2 flex flex-col gap-2">
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
        class="flex-1 overflow-y-auto"
      >
        <div class="mx-auto w-full max-w-3xl px-4 py-3 space-y-4">
          <template
            v-for="message in store.activeMessages"
            :key="message.id"
          >
          <div
            v-if="message.role === 'user'"
            class="flex justify-end"
          >
            <div class="flex items-end gap-1.5 justify-end max-w-[85%]">
              <UIcon
                v-if="message.source === 'voice'"
                name="i-lucide-mic"
                class="size-3.5 text-dimmed mb-1"
              />
              <div class="rounded-lg bg-primary text-white px-4 py-2 text-sm whitespace-pre-wrap break-words">
                {{ (message.parts[0] as TextPart | undefined)?.text ?? '' }}
              </div>
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
            <div class="flex flex-col gap-2 min-w-0 flex-1">
              <template
                v-for="(part, pIdx) in message.parts"
                :key="pIdx"
              >
                <div
                  v-if="part.type === 'text' && part.text"
                  class="prose prose-sm dark:prose-invert max-w-none text-sm break-words [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 [&_p]:my-2"
                  v-html="renderMarkdown(part.text)"
                />

                <div
                  v-else-if="part.type === 'tool-call' && part.status === 'calling' && isVisibleToolPart(part)"
                  class="flex items-center gap-1.5 text-xs text-muted py-1"
                >
                  <UIcon name="i-lucide-loader-circle" class="animate-spin size-3.5" />
                  {{ toolLabel(part.toolName) }}...
                </div>

                <NuxtLink
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateContact' && isVisibleToolPart(part)"
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
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && part.toolName === 'CreateDeal' && isVisibleToolPart(part)"
                  :to="`/leasing/deals/${part.result?.deal_id}`"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UIcon name="i-lucide-handshake" class="text-primary shrink-0" />
                  <div>
                    <p class="font-medium">{{ $t('copilot.results.dealFor', { name: part.result?.contact_name }) }}</p>
                    <p class="text-xs text-muted">{{ $t('copilot.results.dealCreated') }}</p>
                  </div>
                </NuxtLink>

                <div
                  v-else-if="part.type === 'tool-call' && part.status === 'done' && isVisibleToolPart(part)"
                  class="flex items-center gap-2 rounded-xl border border-default bg-elevated px-3 py-2 text-sm"
                >
                  <UIcon
                    :name="part.result?.success === false ? 'i-lucide-circle-x' : 'i-lucide-circle-check'"
                    :class="part.result?.success === false ? 'text-error' : 'text-primary'"
                    class="shrink-0"
                  />
                  <div>
                    <p class="font-medium">
                      {{ toolLabel(part.toolName) }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ (part.result?.success === false ? part.result?.error : part.result?.message)
                        ?? (part.result?.success === false ? $t('copilot.results.actionFailed') : $t('copilot.results.actionCompleted')) }}
                    </p>
                  </div>
                </div>

                <div
                  v-else-if="part.type === 'tool-call' && part.status === 'error' && isVisibleToolPart(part)"
                  class="flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
                >
                  <UIcon name="i-lucide-circle-x" class="shrink-0" />
                  {{ toolLabel(part.toolName) }} — {{ $t('copilot.results.actionFailed') }}
                </div>
              </template>
            </div>
          </div>
        </template>

        <template v-if="store.pendingApprovals.length > 0">
          <div
            v-if="store.pendingApprovals.length > 1"
            class="flex items-center justify-between gap-2 px-1"
          >
            <p class="text-xs text-muted">
              {{ $t('copilot.approvals.pendingCount', { count: store.pendingApprovals.length }) }}
            </p>
            <div class="flex gap-2">
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                @click="store.approveAllPending()"
              >
                {{ $t('copilot.approvals.approveAll') }}
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                @click="store.rejectAllPending()"
              >
                {{ $t('copilot.approvals.rejectAll') }}
              </UButton>
            </div>
          </div>

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

            <template v-if="isDecided(approval.id)">
              <p class="flex items-center gap-1.5 text-xs text-muted">
                <UIcon
                  :name="decidedAction(approval.id) === 'approve' ? 'i-lucide-check' : 'i-lucide-x'"
                  class="shrink-0"
                />
                {{ decidedAction(approval.id) === 'approve'
                  ? $t('copilot.approvals.approvedWaiting')
                  : $t('copilot.approvals.rejectedWaiting') }}
              </p>
            </template>
            <template v-else>
              <UTextarea
                v-model="rejectReasons[approval.id]"
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
                  @click="store.rejectPending(approval.id, rejectReasons[approval.id]?.trim() || undefined)"
                >
                  {{ $t('copilot.approvals.reject') }}
                </UButton>
              </div>
            </template>
          </div>
        </template>

        <div
          v-if="streamErrorMessage"
          class="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
        >
          {{ streamErrorMessage }}
        </div>

        <div
          v-if="store.isBusy && !lastAssistantHasContent && store.pendingApprovals.length === 0 && !hasVisibleToolSpinner"
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
      </div>

      <div class="border-t border-default bg-default shrink-0">
        <form
          class="mx-auto w-full max-w-3xl px-4 py-3"
          @submit.prevent="handleSendMessage"
        >
          <div class="rounded-lg border border-default bg-elevated px-4 pt-3 pb-2 flex flex-col gap-2">
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
            <div
              class="flex items-center gap-2"
              :class="canUseVoice ? 'justify-between' : 'justify-end'"
            >
              <div
                v-if="canUseVoice"
                class="flex items-center gap-2"
              >
                <UButton
                  type="button"
                  :icon="voiceStatus === 'live' ? 'i-lucide-mic-off' : 'i-lucide-mic'"
                  :color="voiceStatus === 'live' || voiceStatus === 'error' ? 'error' : 'neutral'"
                  :variant="voiceStatus === 'live' ? 'soft' : 'ghost'"
                  size="xs"
                  :loading="voiceStatus === 'connecting'"
                  :aria-label="voiceStatus === 'live' ? $t('copilot.voice.stop') : $t('copilot.voice.start')"
                  @click="toggleVoice()"
                />
                <span
                  v-if="voiceStatus === 'live' && waitingForCopilot"
                  class="text-xs text-muted truncate max-w-48"
                  :title="lastHeardQuery ?? undefined"
                >
                  {{ $t('copilot.voice.waiting') }}
                </span>
                <span
                  v-else-if="voiceStatus === 'live'"
                  class="text-xs text-muted"
                >
                  {{ $t('copilot.voice.live') }}
                </span>
                <span
                  v-else-if="voiceStatus === 'connecting'"
                  class="text-xs text-muted"
                >
                  {{ $t('copilot.voice.connecting') }}
                </span>
                <span
                  v-else-if="voiceStatus === 'error'"
                  class="text-xs text-error"
                >
                  {{ voiceError ?? $t('copilot.voice.failed') }}
                </span>
              </div>
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
