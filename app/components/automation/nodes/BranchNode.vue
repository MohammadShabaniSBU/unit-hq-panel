<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { AutomationNodeData } from '~/composables/useAutomationEditor'
import { automationCanvasKey } from '~/composables/useAutomationEditor'
import type { AutomationNodeType, BranchLogicConfig } from '~/types/automation'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

const props = defineProps<NodeProps<AutomationNodeData>>()

const canvas = inject(automationCanvasKey, null)

const node = computed(() => props.data.automationNode)
const def = computed(() => NODE_TYPE_DEFINITIONS[node.value.type])
const arms = computed(() => {
  const config = node.value.config as BranchLogicConfig
  return Array.isArray(config.arms) ? config.arms : []
})

function canAdd(armId: string) {
  return canvas !== null && !canvas.readonly.value && !canvas.hasOutgoing(props.id, armId)
}

function handleAdd(type: AutomationNodeType, armId: string) {
  canvas?.addChild(props.id, type, armId)
}

const ARM_SLOT_PX = 96
const MIN_WIDTH_PX = 220

const nodeWidth = computed(() =>
  Math.max(MIN_WIDTH_PX, arms.value.length * ARM_SLOT_PX)
)

function handleLeft(index: number) {
  if (arms.value.length === 0) {
    return '50%'
  }
  return `${((index + 0.5) / arms.value.length) * 100}%`
}
</script>

<template>
  <div
    class="automation-node automation-node--branch"
    :class="{ 'automation-node--selected': selected }"
    :style="{ width: `${nodeWidth}px` }"
  >
    <Handle
      id="target"
      type="target"
      :position="Position.Top"
      :connectable="false"
      class="automation-node__handle"
    />

    <div class="automation-node__header automation-node__header--branch">
      <UIcon
        :name="def?.icon ?? 'i-lucide-git-branch'"
        class="size-3.5 shrink-0"
      />
      <span class="text-xs font-semibold uppercase tracking-wide">{{ $t('automations.config.branch.kind') }}</span>
    </div>

    <div class="automation-node__body">
      <p class="text-sm font-medium text-highlighted">
        {{ node.label }}
      </p>
      <p class="mt-0.5 text-xs text-dimmed">
        {{ def?.description ?? '' }}
      </p>
    </div>

    <Handle
      v-for="(arm, index) in arms"
      :id="arm.id"
      :key="arm.id"
      type="source"
      :position="Position.Bottom"
      :connectable="false"
      :style="{ left: handleLeft(index) }"
      class="automation-node__handle"
    />

    <div class="automation-node__arms">
      <div
        v-for="(arm, index) in arms"
        :key="arm.id"
        class="automation-node__arm"
        :style="{ left: handleLeft(index) }"
      >
        <p class="automation-node__arm-label">
          {{ arm.label || $t('automations.config.branch.arm', { n: index + 1 }) }}
        </p>
        <div
          v-if="canAdd(arm.id)"
          class="automation-node__add nodrag nopan"
          @click.stop
          @mousedown.stop
        >
          <AutomationAddNodeButton @select="handleAdd($event, arm.id)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.automation-node {
  position: relative;
  box-sizing: border-box;
  padding-bottom: 2.75rem;
  border-radius: 0.5rem;
  border: 1.5px solid var(--ui-border);
  background: var(--ui-bg);
  box-shadow: 0 1px 4px 0 rgb(0 0 0 / 0.08);
  transition: box-shadow 0.15s, border-color 0.15s;
}

.automation-node--selected {
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgb(217 119 6 / 0.15);
}

.automation-node__header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem 0.4rem 0 0;
}

.automation-node__header--branch {
  background: rgb(217 119 6 / 0.1);
  color: #d97706;
  border-bottom: 1px solid rgb(217 119 6 / 0.2);
}

.automation-node__body {
  padding: 0.625rem 0.75rem 0.75rem;
}

.automation-node__handle {
  width: 10px !important;
  height: 10px !important;
  background: #d97706 !important;
  border: 2px solid var(--ui-bg) !important;
}

.automation-node__arms {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2.75rem;
}

.automation-node__arm {
  position: absolute;
  bottom: 0;
  display: flex;
  width: 4.5rem;
  transform: translateX(-50%);
  flex-direction: column;
  align-items: center;
}

.automation-node__arm-label {
  margin-top: 0.65rem;
  max-width: 4.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  line-height: 1.1;
  color: var(--ui-text-dimmed);
  text-align: center;
}

.automation-node__add {
  margin-top: 0.25rem;
  z-index: 5;
}
</style>
