import { ref, type Ref } from 'vue'
import type { EmailDocumentV2 } from '../types/email-block-document'
import { applyOps, type BlockOp } from '../utils/emailBlockOps'

export interface HistoryReplace {
  before: EmailDocumentV2
  after: EmailDocumentV2
}

export interface HistoryMeta {
  source?: 'user' | 'assistant'
  turnId?: number | null
  subjectBefore?: string | null
  subjectAfter?: string | null
}

export interface HistoryEntry {
  ops: Array<BlockOp>
  inverse: Array<BlockOp>
  label: string
  coalesceKey: string | null
  at: number
  source: 'user' | 'assistant'
  turnId: number | null
  subjectBefore: string | null
  subjectAfter: string | null
  replace: HistoryReplace | null
}

const MAX_ENTRIES = 100
const COALESCE_MS = 1000

function cloneDoc(doc: EmailDocumentV2): EmailDocumentV2 {
  return JSON.parse(JSON.stringify(doc)) as EmailDocumentV2
}

export function useEditorHistory(
  docRef: Ref<EmailDocumentV2>,
  options: { now?: () => number } = {}
) {
  const now = options.now ?? (() => Date.now())
  const undoStack = ref<Array<HistoryEntry>>([])
  const redoStack = ref<Array<HistoryEntry>>([])

  function pushEntry(entry: HistoryEntry) {
    undoStack.value.push(entry)
    if (undoStack.value.length > MAX_ENTRIES) undoStack.value.shift()
    redoStack.value = []
  }

  function commit(
    ops: Array<BlockOp>,
    label: string,
    coalesce?: { key: string },
    meta?: HistoryMeta
  ): boolean {
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
    pushEntry({
      ops,
      inverse: applied.inverse,
      label,
      coalesceKey: key,
      at: stamp,
      source: meta?.source ?? 'user',
      turnId: meta?.turnId ?? null,
      subjectBefore: meta?.subjectBefore ?? null,
      subjectAfter: meta?.subjectAfter ?? null,
      replace: null
    })
    return true
  }

  function commitReplace(after: EmailDocumentV2, label: string, meta?: HistoryMeta): boolean {
    const before = cloneDoc(docRef.value)
    const next = cloneDoc(after)
    const subjectBefore = meta?.subjectBefore ?? null
    const subjectAfter = meta?.subjectAfter ?? null
    const sameDoc = JSON.stringify(before) === JSON.stringify(next)
    const sameSubject = subjectBefore === subjectAfter
    if (sameDoc && sameSubject) return false
    docRef.value = next
    pushEntry({
      ops: [],
      inverse: [],
      label,
      coalesceKey: null,
      at: now(),
      source: meta?.source ?? 'assistant',
      turnId: meta?.turnId ?? null,
      subjectBefore,
      subjectAfter,
      replace: { before, after: cloneDoc(next) }
    })
    return true
  }

  function applyEntry(entry: HistoryEntry, direction: 'undo' | 'redo') {
    if (entry.replace) {
      docRef.value = cloneDoc(direction === 'undo' ? entry.replace.before : entry.replace.after)
      return
    }
    const ops = direction === 'undo' ? entry.inverse : entry.ops
    if (ops.length === 0) return
    docRef.value = applyOps(docRef.value, ops).doc
  }

  function undo(): HistoryEntry | undefined {
    const entry = undoStack.value.pop()
    if (!entry) return undefined
    applyEntry(entry, 'undo')
    redoStack.value.push(entry)
    return entry
  }

  function redo(): HistoryEntry | undefined {
    const entry = redoStack.value.pop()
    if (!entry) return undefined
    applyEntry(entry, 'redo')
    undoStack.value.push(entry)
    return entry
  }

  function reset() {
    undoStack.value = []
    redoStack.value = []
  }

  return { undoStack, redoStack, commit, commitReplace, undo, redo, reset }
}
