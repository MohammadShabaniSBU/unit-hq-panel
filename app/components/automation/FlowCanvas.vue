<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { NodeMouseEvent } from '@vue-flow/core'
import type { VfNode, VfEdge } from '~/composables/useAutomationEditor'
import { automationCanvasKey } from '~/composables/useAutomationEditor'
import type { AutomationNodeType } from '~/types/automation'
import AutomationNodesTriggerNode from '~/components/automation/nodes/TriggerNode.vue'
import AutomationNodesActionNode from '~/components/automation/nodes/ActionNode.vue'
import AutomationNodesBranchNode from '~/components/automation/nodes/BranchNode.vue'

const props = withDefaults(defineProps<{
  nodes: Array<VfNode>
  edges: Array<VfEdge>
  selectedNodeId: string | null
  readonly?: boolean
}>(), {
  readonly: false
})

const emit = defineEmits<{
  'update:nodes': [nodes: Array<VfNode>]
  'update:edges': [edges: Array<VfEdge>]
  'node-click': [id: string]
  'canvas-click': []
  'add-node-after': [parentId: string, type: AutomationNodeType, sourceHandle?: string]
  'remove-node': [id: string]
}>()

const isReadonly = computed(() => props.readonly)

provide(automationCanvasKey, {
  readonly: isReadonly,
  hasOutgoing: (nodeId, sourceHandle) => props.edges.some((edge) => {
    if (edge.source !== nodeId) return false
    if (sourceHandle === undefined) return true
    return (edge.sourceHandle || 'default') === sourceHandle
  }),
  addChild: (parentId, type, sourceHandle) => {
    if (props.readonly) return
    emit('add-node-after', parentId, type, sourceHandle)
  }
})

const { zoomIn, zoomOut, getNodes, dimensions, setViewport } = useVueFlow()

const TOP_PADDING = 80

async function centerReadable() {
  await nextTick()

  const pane = dimensions.value
  const nodes = getNodes.value
  if (!pane.width || nodes.length === 0) {
    return
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  for (const node of nodes) {
    const width = node.dimensions?.width || 220
    minX = Math.min(minX, node.position.x)
    maxX = Math.max(maxX, node.position.x + width)
    minY = Math.min(minY, node.position.y)
  }

  const zoom = 1
  const graphCenterX = (minX + maxX) / 2
  await setViewport({
    x: pane.width / 2 - graphCenterX * zoom,
    y: TOP_PADDING - minY * zoom,
    zoom
  })
}

watch(() => props.nodes.map(node => node.id).join(','), (ids) => {
  if (!ids) {
    return
  }
  void centerReadable()
})

function handleZoomIn() {
  void zoomIn()
}

function handleZoomOut() {
  void zoomOut()
}

function handleFitView() {
  void centerReadable()
}

function onEdgesChange(changes: unknown) {
  if (props.readonly) {
    return
  }
  const removals = (changes as Array<{ type: string, id: string }>)
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

function onKeyDown(event: KeyboardEvent) {
  if (props.readonly) {
    return
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && props.selectedNodeId) {
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return
    }
    const selected = props.nodes.find(n => n.id === props.selectedNodeId)
    if (selected?.data?.automationNode.kind === 'trigger') {
      return
    }
    emit('remove-node', props.selectedNodeId)
  }
}

const nodeTypes = {
  triggerNode: AutomationNodesTriggerNode,
  actionNode: AutomationNodesActionNode,
  branchNode: AutomationNodesBranchNode
}

function onNodesChange(changes: unknown) {
  if (props.readonly) {
    return
  }
  // Sync position changes back up
  const updatedNodes = props.nodes.map((n) => {
    const change = (changes as Array<{ id: string, position?: { x: number, y: number }, type: string }>)
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
    class="relative size-full"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :default-edge-options="{ type: 'smoothstep', animated: false }"
      :nodes-connectable="false"
      :edges-updatable="false"
      :connect-on-click="false"
      :delete-key-code="null"
      :min-zoom="0.3"
      :max-zoom="2"
      class="size-full"
      @init="centerReadable"
      @nodes-initialized="centerReadable"
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

    <div
      v-if="nodes.length > 0"
      class="absolute bottom-4 left-4 z-10 flex flex-col gap-1"
    >
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        size="sm"
        square
        :aria-label="$t('automations.canvas.zoomIn')"
        @click="handleZoomIn"
      />
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="outline"
        size="sm"
        square
        :aria-label="$t('automations.canvas.zoomOut')"
        @click="handleZoomOut"
      />
      <UButton
        icon="i-lucide-maximize-2"
        color="neutral"
        variant="outline"
        size="sm"
        square
        :aria-label="$t('automations.canvas.fitView')"
        @click="handleFitView"
      />
    </div>
  </div>
</template>
