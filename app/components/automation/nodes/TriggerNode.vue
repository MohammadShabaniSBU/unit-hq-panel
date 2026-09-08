<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { AutomationNodeData } from '~/composables/useAutomationEditor'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

const props = defineProps<NodeProps<AutomationNodeData>>()

const node = computed(() => props.data.automationNode)
const def = computed(() => NODE_TYPE_DEFINITIONS[node.value.type])
</script>

<template>
  <div
    class="automation-node automation-node--trigger"
    :class="{ 'automation-node--selected': selected }"
  >
    <div class="automation-node__header automation-node__header--trigger">
      <UIcon
        :name="def?.icon ?? 'i-lucide-circle'"
        class="size-3.5 shrink-0"
      />
      <span class="text-xs font-semibold uppercase tracking-wide">Trigger</span>
    </div>

    <div class="automation-node__body">
      <p class="text-sm font-medium text-highlighted">
        {{ node.label }}
      </p>
      <p class="mt-0.5 text-xs text-dimmed">
        {{ def?.description ?? '' }}
      </p>
    </div>

    <!-- Only outgoing handle — triggers have no incoming connections -->
    <Handle
      id="default"
      type="source"
      :position="Position.Bottom"
      class="automation-node__handle"
    />
  </div>
</template>

<style scoped>
.automation-node {
  min-width: 200px;
  max-width: 260px;
  border-radius: 0.5rem;
  border: 1.5px solid var(--ui-border);
  background: var(--ui-bg);
  box-shadow: 0 1px 4px 0 rgb(0 0 0 / 0.08);
  transition: box-shadow 0.15s, border-color 0.15s;
}

.automation-node--selected {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgb(124 58 237 / 0.15);
}

.automation-node__header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem 0.4rem 0 0;
}

.automation-node__header--trigger {
  background: rgb(124 58 237 / 0.12);
  color: #7c3aed;
  border-bottom: 1px solid rgb(124 58 237 / 0.2);
}

.automation-node__body {
  padding: 0.625rem 0.75rem 0.75rem;
}

.automation-node__handle {
  width: 10px !important;
  height: 10px !important;
  background: #7c3aed !important;
  border: 2px solid var(--ui-bg) !important;
}
</style>
