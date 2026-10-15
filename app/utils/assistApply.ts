import type { EmailDocumentV2 } from '../types/email-block-document'
import {
  applyOps,
  findBlock,
  findColumn,
  findSectionIndex,
  type BlockOp
} from './emailBlockOps'

export interface StoredTurnOp {
  op: BlockOp
  inverse?: Array<BlockOp>
}

export type AssistPlan
  = | { outcome: 'apply', ops: Array<BlockOp>, touchedIds: Array<string> }
    | { outcome: 'conflict', skipped: Array<BlockOp> }

export function unwrapTurnOps(stored: Array<StoredTurnOp>): Array<BlockOp> {
  return stored.map(item => item.op)
}

export function opTargetMissing(doc: EmailDocumentV2, op: BlockOp): boolean {
  switch (op.op) {
    case 'add_section':
      return false
    case 'remove_section':
    case 'move_section':
    case 'set_section_layout':
    case 'update_section':
      return findSectionIndex(doc, op.section_id) < 0
    case 'insert_blocks':
      return findColumn(doc, op.column_id) == null
    case 'update_block':
    case 'remove_block':
      return findBlock(doc, op.block_id) == null
    case 'move_block':
      return findBlock(doc, op.block_id) == null || findColumn(doc, op.to_column_id) == null
    default:
      return false
  }
}

export function touchedIdsFromOps(ops: Array<BlockOp>): Array<string> {
  const ids: Array<string> = []
  for (const op of ops) {
    if (op.op === 'add_section') {
      ids.push(op.section.id)
      for (const column of op.section.columns) {
        ids.push(column.id)
        for (const block of column.blocks) ids.push(block.id)
      }
      continue
    }
    if (op.op === 'insert_blocks') {
      for (const block of op.blocks) ids.push(block.id)
      continue
    }
    if (op.op === 'move_block') {
      ids.push(op.block_id)
      continue
    }
    if ('section_id' in op) {
      ids.push(op.section_id)
      continue
    }
    if ('block_id' in op) ids.push(op.block_id)
  }
  return ids
}

/**
 * Hash match applies every op. A hash miss rebases: a missing target conflicts
 * and leaves the caller to keep the current document. Matching updates are not skips.
 */
export function planAssistApply(
  doc: EmailDocumentV2,
  ops: Array<BlockOp>,
  hashesMatch: boolean
): AssistPlan {
  if (!hashesMatch) {
    const skipped = ops.filter(op => opTargetMissing(doc, op))
    if (skipped.length > 0) {
      return { outcome: 'conflict', skipped }
    }
  }
  return { outcome: 'apply', ops, touchedIds: touchedIdsFromOps(ops) }
}

export function applyPlanned(
  doc: EmailDocumentV2,
  plan: AssistPlan
): { doc: EmailDocumentV2, inverse: Array<BlockOp> } | null {
  if (plan.outcome !== 'apply') return null
  return applyOps(doc, plan.ops)
}
