<script setup lang="ts">
import type { AgentReplyLocale, AgentTraceEntry, AgentTraceTotals } from '~/types/agents'
import { formatAgentCost } from '~/utils/agentCost'

const props = defineProps<{
  entries: Array<AgentTraceEntry>
  totals: AgentTraceTotals
  replyLocale: AgentReplyLocale
}>()

const { t } = useI18n()
const toast = useToast()

function translate(prefix: string, key: string): string {
  const path = `${prefix}.${key}`
  const label = t(path)
  return label === path ? key : label
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch {
    return String(value)
  }
}

function verdictLabel(verdict: string): string {
  if (verdict === 'pass') {
    return t('demo.chat.guardPass')
  }
  if (verdict === 'block') {
    return t('demo.chat.guardBlock')
  }
  if (verdict === 'retry') {
    return t('demo.chat.guardRetry')
  }
  return verdict
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.entries, null, 2))
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
        {{ $t('demo.chat.noCost') }}
        · {{ $t('demo.chat.tokensIn', { count: totals.uncostedInputTokens }) }}
        / {{ $t('demo.chat.tokensOut', { count: totals.uncostedOutputTokens }) }}
      </p>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <p
        v-if="entries.length === 0"
        class="px-1 py-8 text-center text-sm text-dimmed"
      >
        {{ $t('demo.chat.traceEmpty') }}
      </p>
      <div class="flex flex-col gap-2">
        <details
          v-for="entry in entries"
          :key="entry.id"
          class="rounded-md border border-default bg-elevated/40 px-3 py-2"
        >
          <summary class="cursor-pointer text-sm font-medium text-highlighted">
            <template v-if="entry.kind === 'tool'">
              {{ translate('ai.tools', entry.tool_key) }}
              <span
                v-if="entry.status"
                class="ml-1 font-normal text-dimmed"
              >· {{ entry.status }}</span>
            </template>
            <template v-else-if="entry.kind === 'guardrail'">
              {{ translate('ai.guards', entry.guard) }}
              <span class="ml-1 font-normal text-dimmed">· {{ verdictLabel(entry.verdict) }}</span>
            </template>
            <template v-else-if="entry.kind === 'handoff'">
              {{ translate('ai.handoff_reasons', entry.reason) }}
              <span class="ml-1 font-normal text-dimmed">
                · {{ translate('ai.handoff_triggers', entry.trigger_source) }}
              </span>
            </template>
            <template v-else>
              {{ $t('demo.chat.tokensIn', { count: entry.input_tokens }) }}
              /
              {{ $t('demo.chat.tokensOut', { count: entry.output_tokens }) }}
            </template>
          </summary>

          <div
            v-if="entry.kind === 'tool'"
            class="mt-2 space-y-2 text-xs text-toned"
          >
            <p v-if="entry.denied_reason">
              {{ $t('demo.chat.deniedReason') }}:
              {{ translate('ai.denied_reasons', entry.denied_reason) }}
            </p>
            <p v-if="entry.duration_ms != null">
              {{ $t('demo.chat.duration', { ms: entry.duration_ms }) }}
            </p>
            <p v-if="entry.result_summary">
              {{ entry.result_summary }}
            </p>
            <div>
              <p class="mb-1 font-medium text-highlighted">
                {{ $t('demo.chat.arguments') }}
              </p>
              <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(entry.arguments) }}</pre>
            </div>
            <details v-if="entry.result !== undefined">
              <summary class="cursor-pointer font-medium text-highlighted">
                {{ $t('demo.chat.resultFull') }}
              </summary>
              <pre class="mt-1 overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(entry.result) }}</pre>
            </details>
          </div>

          <div
            v-else-if="entry.kind === 'guardrail'"
            class="mt-2 text-xs text-toned"
          >
            <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(entry.detail ?? null) }}</pre>
          </div>

          <div
            v-else-if="entry.kind === 'handoff'"
            class="mt-2 text-xs text-toned"
          >
            <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(entry.detail) }}</pre>
          </div>

          <div
            v-else
            class="mt-2 space-y-1 text-xs text-toned"
          >
            <p v-if="entry.estimated_cost && entry.currency">
              {{ formatAgentCost(entry.estimated_cost, entry.currency) }}
            </p>
            <p v-else>
              {{ $t('demo.chat.noCost') }}
            </p>
          </div>
        </details>
      </div>
    </div>
  </aside>
</template>
