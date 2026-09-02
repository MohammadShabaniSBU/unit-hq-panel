<script setup lang="ts">
import type {
  AgentReplyLocale,
  AgentTraceEntry,
  AgentTraceTotals
} from '~/types/agents'
import { formatAgentCost } from '~/utils/agentCost'

const props = defineProps<{
  entries: Array<AgentTraceEntry>
  totals: AgentTraceTotals
  replyLocale: AgentReplyLocale
  conversationId?: number | null
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()

async function copyJson() {
  if (props.conversationId == null) {
    toast.add({ title: t('demo.chat.copyFailed'), color: 'error' })
    return
  }
  try {
    const response = await get<{ trace: unknown }>(`/api/agent-conversations/${props.conversationId}`)
    await navigator.clipboard.writeText(JSON.stringify(response.data.trace, null, 2))
    toast.add({ title: t('demo.chat.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('demo.chat.copyFailed'), color: 'error' })
  }
}

const localeName = computed(() => t(`demo.chat.locales.${props.replyLocale}`))
</script>

<template>
  <aside class="flex h-full w-96 shrink-0 flex-col border-l border-default bg-default">
    <div class="flex shrink-0 items-start justify-between gap-2 border-b border-default px-4 py-3">
      <div>
        <h2 class="text-sm font-medium text-highlighted">
          {{ $t('demo.chat.traceTitle') }}
        </h2>
        <p class="mt-0.5 text-[11px] text-dimmed">
          {{ $t('demo.chat.localeLabel', { locale: localeName }) }}
        </p>
      </div>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-copy"
        :disabled="entries.length === 0"
        @click="copyJson"
      >
        {{ $t('demo.chat.copyJson') }}
      </UButton>
    </div>
    <div class="shrink-0 space-y-1 border-b border-default px-4 py-3 text-xs text-toned">
      <p>{{ $t('demo.chat.totalsTurns', { count: totals.turns }) }}</p>
      <p>{{ $t('demo.chat.totalsTokens', { count: totals.inputTokens + totals.outputTokens }) }}</p>
      <p>{{ $t('demo.chat.totalsTools', { count: totals.toolCalls }) }}</p>
      <p>{{ $t('demo.chat.totalsBlocks', { count: totals.blocks }) }}</p>
      <p
        v-for="row in totals.costs"
        :key="row.currency"
      >
        {{ formatAgentCost(row.estimated_cost, row.currency) }}
      </p>
      <p
        v-if="totals.costs.length === 0 && (totals.uncostedInputTokens + totals.uncostedOutputTokens) > 0"
        class="text-dimmed"
      >
        {{ $t('agents.trace.noPriceRow') }}
        · {{ $t('demo.chat.tokensIn', { count: totals.uncostedInputTokens }) }}
        / {{ $t('demo.chat.tokensOut', { count: totals.uncostedOutputTokens }) }}
      </p>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <AgentsAgentTraceTurnList :entries="entries" />
    </div>
  </aside>
</template>
