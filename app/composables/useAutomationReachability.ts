import type {
  AutomationEdge,
  AutomationNode,
  NodeIdOutput,
} from '~/types/automation'
import { getNodeIdOutputs } from '~/types/automation'

export interface UpstreamIdOption {
  nodeKey: string
  nodeLabel: string
  field: string
  objectType: string
  label: string
}

/**
 * Walk automation_edges backward from a node and collect upstream nodes
 * that emit an id-shaped field for the requested objectType.
 */
export function useAutomationReachability() {
  function reachableUpstreamKeys(
    fromNodeKey: string,
    edges: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>,
  ): Array<string> {
    const incoming = new Map<string, Array<string>>()
    for (const edge of edges) {
      const list = incoming.get(edge.targetNodeId) ?? []
      list.push(edge.sourceNodeId)
      incoming.set(edge.targetNodeId, list)
    }

    const visited = new Set<string>()
    const queue: Array<string> = [fromNodeKey]

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const parent of incoming.get(current) ?? []) {
        if (visited.has(parent)) {
          continue
        }
        visited.add(parent)
        queue.push(parent)
      }
    }

    return Array.from(visited)
  }

  function upstreamIdOptions(
    fromNodeKey: string,
    objectType: string,
    nodes: Array<AutomationNode>,
    edges: Array<Pick<AutomationEdge, 'sourceNodeId' | 'targetNodeId'>>,
  ): Array<UpstreamIdOption> {
    if (!objectType) {
      return []
    }

    const byKey = new Map(nodes.map(n => [n.nodeKey, n]))
    const upstream = reachableUpstreamKeys(fromNodeKey, edges)
    const options: Array<UpstreamIdOption> = []

    for (const key of upstream) {
      const node = byKey.get(key)
      if (!node) {
        continue
      }

      const outputs: Array<NodeIdOutput> = getNodeIdOutputs(node.type, node.config)
      for (const out of outputs) {
        if (out.objectType !== objectType) {
          continue
        }
        options.push({
          nodeKey: node.nodeKey,
          nodeLabel: node.label,
          field: out.field,
          objectType: out.objectType,
          label: `${node.label} → ${out.field}`,
        })
      }
    }

    return options
  }

  function triggerObjectType(nodes: Array<AutomationNode>): string | null {
    const trigger = nodes.find(n => n.kind === 'trigger')
    if (!trigger) {
      return null
    }
    const objectType = (trigger.config as { objectType?: string }).objectType
    return objectType ?? null
  }

  return {
    reachableUpstreamKeys,
    upstreamIdOptions,
    triggerObjectType,
  }
}
