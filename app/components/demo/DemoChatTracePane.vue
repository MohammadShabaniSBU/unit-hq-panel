<script setup lang="ts">
import type {
  AgentReplyLocale,
  AgentTraceEntry,
  AgentTraceTotals,
  GuardVerdict
} from '~/types/agents'
import { formatAgentCost } from '~/utils/agentCost'
import { groupTrace } from '~/utils/agentTrace'

const props = defineProps<{
  entries: Array<AgentTraceEntry>
  totals: AgentTraceTotals
  replyLocale: AgentReplyLocale
  conversationId?: number | null
}>()

const { t } = useI18n()
const toast = useToast()
const { get } = useApi()

const grouped = computed(() => groupTrace(props.entries))

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

function verdictLabel(verdict: GuardVerdict): string {
  if (verdict === 'pass') {
    return t('demo.chat.guardPass')
  }
  if (verdict === 'block') {
    return t('demo.chat.guardBlock')
  }
  if (verdict === 'warn') {
    return t('agents.trace.guardWarn')
  }
  if (verdict === 'deny') {
    return t('agents.trace.guardDeny')
  }
  return t('agents.trace.guardHandoff')
}

function verdictClass(verdict: GuardVerdict): string {
  if (verdict === 'pass') {
    return 'text-dimmed'
  }
  if (verdict === 'warn' || verdict === 'handoff') {
    return 'text-warning'
  }
  return 'text-error'
}

function deniedClass(reason: string | null | undefined): string {
  if (reason === 'requires_approval') {
    return 'text-warning'
  }
  if (reason) {
    return 'text-error'
  }
  return 'text-dimmed'
}

function messageGroupClass(rewritten: boolean, blocked: boolean): string {
  if (rewritten) {
    return 'border-warning/60 bg-warning/5'
  }
  if (blocked) {
    return 'border-error/60 bg-error/5'
  }
  return 'border-default bg-elevated/40'
}

function usageCostLabel(entry: Extract<AgentTraceEntry, { kind: 'usage' }>): string {
  if (entry.estimated_cost && entry.currency) {
    return formatAgentCost(entry.estimated_cost, entry.currency)
  }
  if (entry.model) {
    return t('agents.trace.noPriceRowNamed', { model: entry.model })
  }
  return t('agents.trace.noPriceRow')
}

function entryKey(entry: AgentTraceEntry): string {
  return `${entry.kind}-${entry.id}-${entry.seq ?? 0}`
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
      <p
        v-if="entries.length === 0"
        class="px-1 py-8 text-center text-sm text-dimmed"
      >
        {{ $t('demo.chat.traceEmpty') }}
      </p>
      <div class="flex flex-col gap-3">
        <section
          v-for="(group, groupIndex) in grouped"
          :key="group.turn ?? `none-${groupIndex}`"
          class="space-y-2"
        >
          <div class="px-1 text-[11px] text-dimmed">
            <p class="font-medium text-toned">
              {{ $t('agents.trace.turn', { number: group.turn ?? '—' }) }}
            </p>
            <p v-if="group.model">
              {{ $t('agents.trace.model', { model: group.model }) }}
            </p>
            <p v-if="group.promptVersion">
              {{ $t('agents.trace.promptVersion', { version: group.promptVersion }) }}
            </p>
            <p v-if="group.occurredAt">
              {{ $t('agents.trace.occurredAt', { time: group.occurredAt }) }}
            </p>
          </div>

          <div
            v-for="(row, rowIndex) in group.rows"
            :key="`${group.turn ?? 'none'}-${row.kind}-${row.seq}-${rowIndex}`"
          >
            <div
              v-if="row.kind === 'message'"
              class="space-y-2 rounded-md border px-3 py-2"
              :class="messageGroupClass(row.rewritten, row.blocked)"
            >
              <div class="flex flex-wrap items-center gap-1 text-xs font-medium text-highlighted">
                <span>
                  {{ row.messageId == null
                    ? $t('agents.trace.messagePending')
                    : $t('agents.trace.messageGroup', { id: row.messageId }) }}
                </span>
                <UBadge
                  v-if="row.rewritten"
                  color="warning"
                  variant="subtle"
                  size="xs"
                  :label="$t('agents.trace.messageRewritten')"
                />
                <UBadge
                  v-else-if="row.blocked"
                  color="error"
                  variant="subtle"
                  size="xs"
                  :label="$t('agents.trace.messageBlocked')"
                />
              </div>
              <details
                v-for="guard in row.guardrails"
                :key="entryKey(guard)"
                class="rounded border border-default/60 bg-default/40 px-2 py-1.5"
              >
                <summary class="cursor-pointer text-sm font-medium text-highlighted">
                  {{ translate('ai.guards', guard.guard) }}
                  <span
                    class="ml-1 font-normal"
                    :class="verdictClass(guard.verdict)"
                  >· {{ verdictLabel(guard.verdict) }}</span>
                </summary>
                <pre class="mt-2 overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug text-toned">{{ prettyJson(guard.detail ?? null) }}</pre>
              </details>
            </div>

            <details
              v-else
              class="rounded-md border border-default bg-elevated/40 px-3 py-2"
            >
              <summary class="cursor-pointer text-sm font-medium text-highlighted">
                <template v-if="row.entry.kind === 'tool'">
                  {{ translate('ai.tools', row.entry.tool_key) }}
                  <span
                    v-if="row.entry.status"
                    class="ml-1 font-normal"
                    :class="deniedClass(row.entry.denied_reason)"
                  >· {{ row.entry.status }}</span>
                  <span
                    v-if="row.entry.replayed"
                    class="ml-1 font-normal text-dimmed"
                  >· {{ $t('demo.chat.replayed') }}</span>
                </template>
                <template v-else-if="row.entry.kind === 'handoff'">
                  {{ translate('ai.handoff_reasons', row.entry.reason) }}
                  <span class="ml-1 font-normal text-dimmed">
                    · {{ translate('ai.handoff_triggers', row.entry.trigger_source) }}
                  </span>
                </template>
                <template v-else-if="row.entry.kind === 'usage'">
                  {{ $t('demo.chat.tokensIn', { count: row.entry.input_tokens }) }}
                  /
                  {{ $t('demo.chat.tokensOut', { count: row.entry.output_tokens }) }}
                </template>
              </summary>

              <div
                v-if="row.entry.kind === 'tool'"
                class="mt-2 space-y-2 text-xs text-toned"
              >
                <p
                  v-if="row.entry.denied_reason"
                  :class="deniedClass(row.entry.denied_reason)"
                >
                  {{ $t('demo.chat.deniedReason') }}:
                  {{ translate('ai.denied_reasons', row.entry.denied_reason) }}
                </p>
                <p
                  v-if="row.entry.error_code"
                  class="text-error"
                >
                  {{ translate('ai.error_codes', row.entry.error_code) }}
                </p>
                <p
                  v-if="row.entry.recovery?.tool"
                  class="text-warning"
                >
                  {{ $t('agents.trace.recoveryTool', {
                    tool: translate('ai.tools', row.entry.recovery.tool)
                  }) }}
                </p>
                <p
                  v-if="row.entry.denied_reason === 'quota_exceeded' && row.entry.result_summary"
                  class="text-error"
                >
                  {{ row.entry.result_summary }}
                </p>
                <DemoPendingProposal
                  v-if="row.entry.denied_reason === 'requires_approval' && row.entry.pending_action_id"
                  :pending-action-id="row.entry.pending_action_id"
                  :tool-key="row.entry.tool_key"
                  :result="row.entry.result"
                />
                <p v-if="row.entry.duration_ms != null">
                  {{ $t('demo.chat.duration', { ms: row.entry.duration_ms }) }}
                </p>
                <p v-if="row.entry.result_summary">
                  {{ row.entry.result_summary }}
                </p>
                <div
                  v-if="row.entry.entities?.length"
                >
                  <p class="mb-1 font-medium text-highlighted">
                    {{ $t('agents.trace.entities') }}
                  </p>
                  <ul class="space-y-0.5">
                    <li
                      v-for="entity in row.entry.entities"
                      :key="`${entity.type}-${entity.id}`"
                    >
                      {{ entity.label }}<span
                        v-if="entity.context"
                        class="text-dimmed"
                      > · {{ entity.context }}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p class="mb-1 font-medium text-highlighted">
                    {{ $t('demo.chat.arguments') }}
                  </p>
                  <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(row.entry.arguments) }}</pre>
                </div>
                <details v-if="row.entry.result !== undefined">
                  <summary class="cursor-pointer font-medium text-highlighted">
                    {{ $t('demo.chat.resultFull') }}
                  </summary>
                  <pre class="mt-1 overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(row.entry.result) }}</pre>
                </details>
              </div>

              <div
                v-else-if="row.entry.kind === 'handoff'"
                class="mt-2 text-xs text-toned"
              >
                <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(row.entry.detail) }}</pre>
              </div>

              <div
                v-else-if="row.entry.kind === 'usage'"
                class="mt-2 space-y-1 text-xs text-toned"
              >
                <p :class="row.entry.estimated_cost && row.entry.currency ? '' : 'text-warning'">
                  {{ usageCostLabel(row.entry) }}
                </p>
                <p
                  v-if="row.entry.cached_input_tokens"
                >
                  {{ $t('agents.trace.cachedInput', { count: row.entry.cached_input_tokens }) }}
                </p>
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>
