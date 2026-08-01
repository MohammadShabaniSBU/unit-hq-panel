<script setup lang="ts">
import type { FilterCondition, FilterGroup } from '~/types/automation'

const props = defineProps<{
  group: FilterGroup
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)

function isGroup(node: FilterCondition | FilterGroup): node is FilterGroup {
  return 'conditions' in node && Array.isArray(node.conditions)
}

function formatValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) return value.map(formatValue).join(', ')
  return String(value)
}
</script>

<template>
  <div
    class="space-y-1.5"
    :class="depth > 0 ? 'ms-3 border-s border-default ps-3' : ''"
  >
    <p
      v-if="group.conditions.length > 0 || group.logic === 'not'"
      class="text-[11px] font-semibold uppercase tracking-wide text-dimmed"
    >
      {{ $t(`automations.runs.lifecycle.logic.${group.logic}`) }}
    </p>

    <div
      v-if="group.conditions.length === 0"
      class="text-xs text-dimmed"
    >
      {{ $t('automations.runs.lifecycle.emptyConditions') }}
    </div>

    <template
      v-for="(node, idx) in group.conditions"
      :key="idx"
    >
      <AutomationConditionTreeReadonly
        v-if="isGroup(node)"
        :group="node"
        :depth="depth + 1"
      />
      <div
        v-else
        class="rounded-lg border border-default bg-elevated px-2.5 py-2 text-xs text-highlighted"
      >
        <span class="font-medium">{{ node.field || '—' }}</span>
        <span class="mx-1.5 text-dimmed">{{ node.operator }}</span>
        <span
          v-if="node.value !== undefined && node.operator !== 'is_empty' && node.operator !== 'is_not_empty'"
          class="tabular-nums"
        >{{ formatValue(node.value) }}</span>
      </div>
    </template>
  </div>
</template>
