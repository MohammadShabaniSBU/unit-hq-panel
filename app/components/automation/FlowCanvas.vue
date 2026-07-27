<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { NodeMouseEvent, Connection } from '@vue-flow/core'
import { nanoid } from 'nanoid'
import type { VfNode, VfEdge } from '~/composables/useAutomationEditor'
import type { AutomationNodeType } from '~/types/automation'
import AutomationNodesTriggerNode from '~/components/automation/nodes/TriggerNode.vue'
import AutomationNodesActionNode from '~/components/automation/nodes/ActionNode.vue'

const props = defineProps<{
  nodes: Array<VfNode>
  edges: Array<VfEdge>
  selectedNodeId: string | null
}>()

const emit = defineEmits<{
  'update:nodes': [nodes: Array<VfNode>]
  'update:edges': [edges: Array<VfEdge>]
  'node-click': [id: string]
  'canvas-click': []
  'add-node': [type: AutomationNodeType, position: { x: number; y: number }]
  'remove-node': [id: string]
}>()

const { screenToFlowCoordinate, onConnect, removeNodes } = useVueFlow()

onConnect((connection: Connection) => {
  if (!connection.source || !connection.target) {
    return
  }

  const next: VfEdge = {
    id: nanoid(),
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || 'default',
    targetHandle: connection.targetHandle || 'target',
    data: { condition: { type: 'always' } },
  }

  emit('update:edges', [...props.edges, next])
})

function onEdgesChange(changes: unknown) {
  const removals = (changes as Array<{ type: string; id: string }>)
    .filter(change => change.type === 'remove')
    .map(change => change.id)

  if (removals.length === 0) {
    return
  }

  emit('update:edges', props.edges.filter(edge => !removals.includes(edge.id)))
}

function onNodeClick(event: NodeMouseEvent) {
  emit('node-click', event.node.id)
}

function onPaneClick() {
  emit('canvas-click')
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const type = event.dataTransfer?.getData('application/automation-node-type') as AutomationNodeType | undefined
  if (!type) return

  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  emit('add-node', type, position)
}

function onKeyDown(event: KeyboardEvent) {
  if ((event.key === 'Delete' || event.key === 'Backspace') && props.selectedNodeId) {
    emit('remove-node', props.selectedNodeId)
    removeNodes([props.selectedNodeId])
  }
}

const nodeTypes = {
  triggerNode: AutomationNodesTriggerNode,
  actionNode: AutomationNodesActionNode,
}

function onNodesChange(changes: unknown) {
  // Sync position changes back up
  const updatedNodes = props.nodes.map((n) => {
    const change = (changes as Array<{ id: string; position?: { x: number; y: number }; type: string }>)
      .find(c => c.id === n.id && c.type === 'position')
    if (change?.position) {
      return { ...n, position: change.position }
    }
    return n
  })
  emit('update:nodes', updatedNodes)
}


</script>

<template>
  <div
    class="size-full"
    tabindex="0"
    @keydown="onKeyDown"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      fit-view-on-init
      :default-edge-options="{ type: 'smoothstep', animated: false }"
      :min-zoom="0.3"
      :max-zoom="2"
      class="size-full"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
    >
      <Background
        pattern-color="var(--ui-border)"
        :gap="20"
        :size="1"
      />

      <!-- Empty state overlay -->
      <template v-if="nodes.length === 0">
        <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div class="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-default">
            <UIcon
              name="i-lucide-workflow"
              class="size-6 text-dimmed"
            />
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-highlighted">
              {{ $t('automations.canvas.emptyTitle') }}
            </p>
            <p class="mt-0.5 text-xs text-dimmed">
              {{ $t('automations.canvas.emptySubtitle') }}
            </p>
          </div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>
