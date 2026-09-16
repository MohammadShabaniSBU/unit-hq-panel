import type { Node, Edge } from '@vue-flow/core'
import { nanoid } from 'nanoid'
import type { ComputedRef, InjectionKey } from 'vue'
import type {
  Automation,
  AutomationNode,
  AutomationEdge,
  AutomationNodeType,
  AutomationNodeConfig,
  AutomationStatus,
  EdgeCondition,
  BranchArm,
  BranchLogicConfig
} from '~/types/automation'
import { NODE_TYPE_DEFINITIONS } from '~/types/automation'

export const VERTICAL_CHAIN_STEP = 180

export interface AutomationCanvasContext {
  readonly: ComputedRef<boolean>
  hasOutgoing: (nodeId: string, sourceHandle?: string) => boolean
  addChild: (parentId: string, type: AutomationNodeType, sourceHandle?: string) => void
}

export const automationCanvasKey: InjectionKey<AutomationCanvasContext> = Symbol('automationCanvas')

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
  const kind = def?.kind ?? node.kind
  return {
    id: node.nodeKey,
    type: kind === 'trigger' ? 'triggerNode' : node.type === 'logic.branch' ? 'branchNode' : 'actionNode',
    position: { x: node.position.x, y: node.position.y },
    data: { automationNode: node }
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
    data: { condition: edge.condition }
  }
}

function fromVfNode(vfNode: VfNode): AutomationNode {
  const existing = vfNode.data.automationNode
  return {
    ...existing,
    position: { x: vfNode.position.x, y: vfNode.position.y }
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
    updatedAt: new Date().toISOString()
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
      edges: vfEdges.value
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

  function addNode(type: AutomationNodeType, position: { x: number, y: number }): string {
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
      updatedAt: now
    }

    vfNodes.value = [...vfNodes.value, toVfNode(newNode)]
    selectedNodeId.value = nodeKey
    return nodeKey
  }

  function addNodeAfter(parentId: string, type: AutomationNodeType, sourceHandle = 'default'): string | null {
    const def = NODE_TYPE_DEFINITIONS[type]
    if (!def || def.kind === 'trigger') {
      return null
    }

    const parent = vfNodes.value.find(n => n.id === parentId)
    if (!parent) {
      return null
    }

    const parentConfig = parent.data.automationNode.config as BranchLogicConfig
    const arms = Array.isArray(parentConfig.arms) ? parentConfig.arms : []
    const armIndex = arms.findIndex(arm => arm.id === sourceHandle)
    const outgoingCount = vfEdges.value.filter(e =>
      e.source === parentId && (e.sourceHandle || 'default') === sourceHandle
    ).length
    const xOffset = armIndex >= 0
      ? (armIndex - (arms.length - 1) / 2) * 240
      : outgoingCount * 240

    const nodeKey = addNode(type, {
      x: parent.position.x + xOffset,
      y: parent.position.y + VERTICAL_CHAIN_STEP
    })

    vfEdges.value = [...vfEdges.value, {
      id: nanoid(),
      source: parentId,
      target: nodeKey,
      sourceHandle,
      targetHandle: 'target',
      data: { condition: { type: 'always' } }
    }]

    return nodeKey
  }

  function branchConfig(nodeId: string): BranchLogicConfig | null {
    const vf = vfNodes.value.find(n => n.id === nodeId)
    if (!vf || vf.data.automationNode.type !== 'logic.branch') {
      return null
    }
    return vf.data.automationNode.config as BranchLogicConfig
  }

  function setBranchArms(nodeId: string, arms: Array<BranchArm>) {
    vfNodes.value = vfNodes.value.map((n) => {
      if (n.id !== nodeId) return n
      return {
        ...n,
        data: {
          automationNode: {
            ...n.data.automationNode,
            config: { ...(n.data.automationNode.config as BranchLogicConfig), arms }
          }
        }
      }
    })
  }

  function collectDescendants(startId: string): Array<string> {
    const ids: Array<string> = []
    const queue = [startId]
    const seen = new Set<string>()
    while (queue.length > 0) {
      const id = queue.shift()
      if (!id || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
      for (const edge of vfEdges.value) {
        if (edge.source === id) {
          queue.push(edge.target)
        }
      }
    }
    return ids
  }

  function addArm(nodeId: string): string | null {
    const config = branchConfig(nodeId)
    if (!config) {
      return null
    }
    const arm: BranchArm = {
      id: nanoid(8),
      label: '',
      filters: { logic: 'and', conditions: [] }
    }
    setBranchArms(nodeId, [...config.arms, arm])
    return arm.id
  }

  function updateArm(nodeId: string, armId: string, patch: Partial<BranchArm>) {
    const config = branchConfig(nodeId)
    if (!config) {
      return
    }
    setBranchArms(nodeId, config.arms.map(arm =>
      arm.id === armId ? { ...arm, ...patch } : arm
    ))
  }

  function removeArm(nodeId: string, armId: string) {
    const config = branchConfig(nodeId)
    if (!config || config.arms.length <= 1) {
      return
    }

    const outgoing = vfEdges.value.filter(e => e.source === nodeId && e.sourceHandle === armId)
    const toRemove = new Set<string>()
    for (const edge of outgoing) {
      for (const id of collectDescendants(edge.target)) {
        toRemove.add(id)
      }
    }

    vfEdges.value = vfEdges.value.filter(e =>
      !toRemove.has(e.source) && !toRemove.has(e.target) && !(e.source === nodeId && e.sourceHandle === armId)
    )
    vfNodes.value = vfNodes.value.filter(n => !toRemove.has(n.id))
    setBranchArms(nodeId, config.arms.filter(arm => arm.id !== armId))

    if (selectedNodeId.value && toRemove.has(selectedNodeId.value)) {
      selectedNodeId.value = nodeId
    }
  }

  function removeNode(id: string) {
    const target = vfNodes.value.find(n => n.id === id)
    if (target?.data.automationNode.kind === 'trigger') {
      return
    }

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
          automationNode: { ...n.data.automationNode, config }
        }
      }
    })
  }

  function updateNodeLabel(id: string, label: string) {
    vfNodes.value = vfNodes.value.map((n) => {
      if (n.id !== id) return n
      return {
        ...n,
        data: {
          automationNode: { ...n.data.automationNode, label }
        }
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
  function extract(): { nodes: Array<AutomationNode>, edges: Array<AutomationEdge> } {
    const nodes = vfNodes.value.map(fromVfNode)
    const edges = vfEdges.value.map(e => fromVfEdge(e, automationId.value))
    return { nodes, edges }
  }

  /** Mark the current state as the saved baseline (call after a successful save). */
  function markClean() {
    initialSnapshot.value = snapshot()
  }

  /**
   * Display-only remap for compiled playbook graphs: walk the unique path
   * from the trigger and stack nodes top-to-bottom so cards do not overlap.
   * Does not persist — call only on readonly compiled views.
   */
  function layoutAsVerticalChain() {
    if (vfNodes.value.length === 0) {
      return
    }

    const byId = new Map(vfNodes.value.map(node => [node.id, node]))
    const outgoing = new Map<string, Array<string>>()
    for (const edge of vfEdges.value) {
      const targets = outgoing.get(edge.source) ?? []
      targets.push(edge.target)
      outgoing.set(edge.source, targets)
    }

    const trigger = vfNodes.value.find(node => node.data.automationNode.kind === 'trigger')
      ?? vfNodes.value[0]

    const ordered: Array<string> = []
    const seen = new Set<string>()
    let current: string | undefined = trigger.id
    while (current && !seen.has(current)) {
      seen.add(current)
      ordered.push(current)
      current = outgoing.get(current)?.[0]
    }

    for (const node of vfNodes.value) {
      if (!seen.has(node.id)) {
        ordered.push(node.id)
      }
    }

    vfNodes.value = ordered.flatMap((id, index) => {
      const node = byId.get(id)
      if (!node) {
        return []
      }
      return [{
        ...node,
        position: { x: 0, y: index * VERTICAL_CHAIN_STEP }
      }]
    })
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
    addNodeAfter,
    addArm,
    updateArm,
    removeArm,
    removeNode,
    updateNodeConfig,
    updateNodeLabel,
    syncVfNodes,
    syncVfEdges,
    extract,
    markClean,
    layoutAsVerticalChain
  }
}
