import type { Node, Edge } from '@vue-flow/core'
import { nanoid } from 'nanoid'
import type {
  Automation,
  AutomationNode,
  AutomationEdge,
  AutomationNodeType,
  AutomationNodeConfig,
  AutomationStatus,
  EdgeCondition,
} from '~/types/automation'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

// ============================================================
// VueFlow ↔ AutomationNode bridge
// ============================================================

export interface AutomationNodeData {
  automationNode: AutomationNode
}

export type VfNode = Node<AutomationNodeData>
export type VfEdge = Edge

function toVfNode(node: AutomationNode): VfNode {
  const def = NODE_TYPE_DEFINITIONS[node.type]
  return {
    id: node.nodeKey,
    type: def.kind === 'trigger' ? 'triggerNode' : def.kind === 'condition' ? 'actionNode' : 'actionNode',
    position: { x: node.position.x, y: node.position.y },
    data: { automationNode: node },
  }
}

function toVfEdge(edge: AutomationEdge): VfEdge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.sourceHandle || 'default',
    targetHandle: edge.targetHandle || 'target',
    label: edge.label,
    data: { condition: edge.condition },
  }
}

function fromVfNode(vfNode: VfNode): AutomationNode {
  const existing = vfNode.data.automationNode
  return {
    ...existing,
    position: { x: vfNode.position.x, y: vfNode.position.y },
  }
}

function fromVfEdge(vfEdge: VfEdge, automationId: string): AutomationEdge {
  const condition: EdgeCondition = (vfEdge.data as { condition?: EdgeCondition } | undefined)?.condition
    ?? { type: 'always' }
  return {
    id: vfEdge.id,
    automationId,
    sourceNodeId: vfEdge.source,
    targetNodeId: vfEdge.target,
    sourceHandle: vfEdge.sourceHandle ?? undefined,
    targetHandle: vfEdge.targetHandle ?? undefined,
    label: typeof vfEdge.label === 'string' ? vfEdge.label : undefined,
    condition,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================
// Editor state
// ============================================================

export function useAutomationEditor() {
  const vfNodes = ref<Array<VfNode>>([])
  const vfEdges = ref<Array<VfEdge>>([])
  const selectedNodeId = ref<string | null>(null)
  const automationId = ref<string>('')
  const metaName = ref('')
  const metaStatus = ref<AutomationStatus>('draft')

  const initialSnapshot = ref<string>('')

  function snapshot(): string {
    return JSON.stringify({
      name: metaName.value,
      status: metaStatus.value,
      nodes: vfNodes.value,
      edges: vfEdges.value,
    })
  }

  /** Load an automation into the editor — call once on mount. */
  function load(automation: Automation) {
    automationId.value = automation.id
    metaName.value = automation.name
    metaStatus.value = automation.status
    vfNodes.value = automation.nodes.map(toVfNode)
    vfEdges.value = automation.edges.map(toVfEdge)
    initialSnapshot.value = snapshot()
    selectedNodeId.value = null
  }

  /** Keep name/status in the dirty snapshot when the toolbar edits them. */
  function setMeta(name: string, status: AutomationStatus) {
    metaName.value = name
    metaStatus.value = status
  }

  const selectedNode = computed<AutomationNode | null>(() => {
    if (!selectedNodeId.value) return null
    const vf = vfNodes.value.find(n => n.id === selectedNodeId.value)
    return vf?.data.automationNode ?? null
  })

  const isDirty = computed(() => snapshot() !== initialSnapshot.value)

  // ---- Mutations ----

  function selectNode(id: string | null) {
    selectedNodeId.value = id
  }

  function addNode(type: AutomationNodeType, position: { x: number; y: number }) {
    const def = NODE_TYPE_DEFINITIONS[type]
    const nodeKey = `${type.replace(/\./g, '_')}_${nanoid(8)}`
    const now = new Date().toISOString()

    const newNode: AutomationNode = {
      id: nodeKey,
      automationId: automationId.value,
      nodeKey,
      kind: def.kind,
      type,
      label: def.label,
      position,
      config: def.createDefaultConfig(),
      createdAt: now,
      updatedAt: now,
    }

    vfNodes.value = [...vfNodes.value, toVfNode(newNode)]
    selectedNodeId.value = nodeKey
  }

  function removeNode(id: string) {
    vfNodes.value = vfNodes.value.filter(n => n.id !== id)
    vfEdges.value = vfEdges.value.filter(e => e.source !== id && e.target !== id)
    if (selectedNodeId.value === id) {
      selectedNodeId.value = null
    }
  }

  function updateNodeConfig(id: string, config: AutomationNodeConfig) {
    vfNodes.value = vfNodes.value.map((n) => {
      if (n.id !== id) return n
      return {
        ...n,
        data: {
          automationNode: { ...n.data.automationNode, config },
        },
      }
    })
  }

  function updateNodeLabel(id: string, label: string) {
    vfNodes.value = vfNodes.value.map((n) => {
      if (n.id !== id) return n
      return {
        ...n,
        data: {
          automationNode: { ...n.data.automationNode, label },
        },
      }
    })
  }

  function syncVfNodes(nodes: Array<VfNode>) {
    vfNodes.value = nodes
  }

  function syncVfEdges(edges: Array<VfEdge>) {
    vfEdges.value = edges
  }

  /** Extract the current editor state as API-ready AutomationNode/Edge arrays. */
  function extract(): { nodes: Array<AutomationNode>; edges: Array<AutomationEdge> } {
    const nodes = vfNodes.value.map(fromVfNode)
    const edges = vfEdges.value.map(e => fromVfEdge(e, automationId.value))
    return { nodes, edges }
  }

  /** Mark the current state as the saved baseline (call after a successful save). */
  function markClean() {
    initialSnapshot.value = snapshot()
  }

  return {
    vfNodes,
    vfEdges,
    selectedNodeId,
    selectedNode,
    isDirty,
    load,
    setMeta,
    selectNode,
    addNode,
    removeNode,
    updateNodeConfig,
    updateNodeLabel,
    syncVfNodes,
    syncVfEdges,
    extract,
    markClean,
  }
}
