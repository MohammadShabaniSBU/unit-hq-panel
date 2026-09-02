<script setup lang="ts">
import type { AgentTraceEntry, GuardVerdict } from '~/types/agents'
import { formatAgentCost } from '~/utils/agentCost'
import { groupTrace } from '~/utils/agentTrace'

const props = defineProps<{
  entries: Array<AgentTraceEntry>
}>()

const { t } = useI18n()

const grouped = computed(() => groupTrace(props.entries))

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
    return t('agents.trace.guardPass')
  }
  if (verdict === 'block') {
    return t('agents.trace.guardBlock')
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
  if (reason === 'verification') {
    return 'text-toned'
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
</script>

<template>
  <p
    v-if="entries.length === 0"
    class="px-1 py-8 text-center text-sm text-dimmed"
  >
    {{ $t('agents.trace.empty') }}
  </p>
  <div
    v-else
    class="flex flex-col gap-3"
  >
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
              <UBadge
                v-if="row.entry.denied_reason === 'verification'"
                color="info"
                variant="subtle"
                size="xs"
                class="ml-1 align-middle"
                :label="translate('ai.denied_reasons', 'verification')"
              />
              <span
                v-else-if="row.entry.status"
                class="ml-1 font-normal"
                :class="deniedClass(row.entry.denied_reason)"
              >· {{ row.entry.status }}</span>
              <span
                v-if="row.entry.replayed"
                class="ml-1 font-normal text-dimmed"
              >· {{ $t('agents.trace.replayed') }}</span>
            </template>
            <template v-else-if="row.entry.kind === 'handoff'">
              {{ translate('ai.handoff_reasons', row.entry.reason) }}
              <span class="ml-1 font-normal text-dimmed">
                · {{ translate('ai.handoff_triggers', row.entry.trigger_source) }}
              </span>
            </template>
            <template v-else-if="row.entry.kind === 'usage'">
              {{ $t('agents.trace.tokensIn', { count: row.entry.input_tokens }) }}
              /
              {{ $t('agents.trace.tokensOut', { count: row.entry.output_tokens }) }}
            </template>
            <template v-else-if="row.entry.kind === 'promotion'">
              {{ $t('agents.trace.promotion') }}
              <span class="ml-1 font-normal text-toned">
                · {{ translate('ai.verification.levels', row.entry.from) }}
                → {{ translate('ai.verification.levels', row.entry.to) }}
              </span>
              <span class="ml-1 font-normal text-dimmed">
                · {{ translate('agents.trace.promotionMethod', row.entry.method) }}
              </span>
            </template>
          </summary>

          <div
            v-if="row.entry.kind === 'tool'"
            class="mt-2 space-y-2 text-xs text-toned"
          >
            <UBadge
              v-if="row.entry.denied_reason === 'verification'"
              color="info"
              variant="subtle"
              size="xs"
              :label="`${$t('agents.trace.deniedReason')}: ${translate('ai.denied_reasons', row.entry.denied_reason)}`"
            />
            <p
              v-else-if="row.entry.denied_reason"
              :class="deniedClass(row.entry.denied_reason)"
            >
              {{ $t('agents.trace.deniedReason') }}:
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
              {{ $t('agents.trace.duration', { ms: row.entry.duration_ms }) }}
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
                {{ $t('agents.trace.arguments') }}
              </p>
              <pre class="overflow-x-auto rounded bg-default p-2 text-[11px] leading-snug">{{ prettyJson(row.entry.arguments) }}</pre>
            </div>
            <details v-if="row.entry.result !== undefined">
              <summary class="cursor-pointer font-medium text-highlighted">
                {{ $t('agents.trace.resultFull') }}
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

          <div
            v-else-if="row.entry.kind === 'promotion'"
            class="mt-2 space-y-1 text-xs text-toned"
          >
            <p>
              {{ $t('agents.trace.promotionFromTo', {
                from: translate('ai.verification.levels', row.entry.from),
                to: translate('ai.verification.levels', row.entry.to)
              }) }}
            </p>
            <p class="text-dimmed">
              {{ translate('agents.trace.promotionMethod', row.entry.method) }}
            </p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
