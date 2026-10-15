import { ref, type Ref } from 'vue'
import type { EmailDocumentV2 } from '../types/email-block-document'
import { applyOps, type BlockOp } from '../utils/emailBlockOps'

export interface HistoryEntry {
  ops: Array<BlockOp>
  inverse: Array<BlockOp>
  label: string
  coalesceKey: string | null
  at: number
}

const MAX_ENTRIES = 100
const COALESCE_MS = 1000

export function useEditorHistory(
  docRef: Ref<EmailDocumentV2>,
  options: { now?: () => number } = {}
) {
  const now = options.now ?? (() => Date.now())
  const undoStack = ref<Array<HistoryEntry>>([])
  const redoStack = ref<Array<HistoryEntry>>([])

  function commit(ops: Array<BlockOp>, label: string, coalesce?: { key: string }): boolean {
    if (ops.length === 0) return false
    const applied = applyOps(docRef.value, ops)
    if (applied.inverse.length === 0) return false
    docRef.value = applied.doc
    const stamp = now()
    const key = coalesce?.key ?? null
    const last = undoStack.value[undoStack.value.length - 1]
    if (key && last && last.coalesceKey === key && stamp - last.at < COALESCE_MS) {
      last.ops = ops
      last.label = label
      last.at = stamp
      redoStack.value = []
      return true
    }
    undoStack.value.push({
      ops,
      inverse: applied.inverse,
      label,
      coalesceKey: key,
      at: stamp
    })
    if (undoStack.value.length > MAX_ENTRIES) undoStack.value.shift()
    redoStack.value = []
    return true
  }

  function undo() {
    const entry = undoStack.value.pop()
    if (!entry) return
    docRef.value = applyOps(docRef.value, entry.inverse).doc
    redoStack.value.push(entry)
  }

  function redo() {
    const entry = redoStack.value.pop()
    if (!entry) return
    docRef.value = applyOps(docRef.value, entry.ops).doc
    undoStack.value.push(entry)
  }

  function reset() {
    undoStack.value = []
    redoStack.value = []
  }

  return { undoStack, redoStack, commit, undo, redo, reset }
}
