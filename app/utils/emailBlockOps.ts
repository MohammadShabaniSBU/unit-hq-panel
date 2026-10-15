import type {
  EmailDocumentV2,
  EmailLayout,
  EmailSection,
  EmailSectionParams,
  EmailV2Block
} from '../types/email-block-document'
import { columnCount, newEmailId, sectionHasRawHtml } from './emailBlocks'

export type BlockOp
  = | { op: 'add_section', index: number, section: EmailSection }
    | { op: 'remove_section', section_id: string }
    | { op: 'move_section', section_id: string, to_index: number }
    | { op: 'set_section_layout', section_id: string, layout: EmailLayout }
    | { op: 'update_section', section_id: string, params: Partial<EmailSectionParams> }
    | { op: 'insert_blocks', column_id: string, index: number, blocks: Array<EmailV2Block> }
    | { op: 'update_block', block_id: string, params: Record<string, unknown> }
    | { op: 'move_block', block_id: string, to_column_id: string, to_index: number }
    | { op: 'remove_block', block_id: string }

export interface BlockLocation {
  sectionIndex: number
  columnIndex: number
  blockIndex: number
  section: EmailSection
  column: EmailSection['columns'][number]
  block: EmailV2Block
}

export interface ColumnLocation {
  sectionIndex: number
  columnIndex: number
  section: EmailSection
  column: EmailSection['columns'][number]
}

export function applyOps(
  doc: EmailDocumentV2,
  ops: Array<BlockOp>
): { doc: EmailDocumentV2, inverse: Array<BlockOp> } {
  const next = JSON.parse(JSON.stringify(doc)) as EmailDocumentV2
  const inverses: Array<Array<BlockOp>> = []
  for (const op of ops) {
    inverses.push(applyOne(next, op))
  }
  inverses.reverse()
  return { doc: next, inverse: inverses.flat() }
}

export function findSectionIndex(doc: EmailDocumentV2, sectionId: string): number {
  return doc.sections.findIndex(section => section.id === sectionId)
}

export function findColumn(doc: EmailDocumentV2, columnId: string): ColumnLocation | null {
  for (let sectionIndex = 0; sectionIndex < doc.sections.length; sectionIndex++) {
    const section = doc.sections[sectionIndex]!
    const columnIndex = section.columns.findIndex(column => column.id === columnId)
    if (columnIndex >= 0) {
      return {
        sectionIndex,
        columnIndex,
        section,
        column: section.columns[columnIndex]!
      }
    }
  }
  return null
}

export function findBlock(doc: EmailDocumentV2, blockId: string): BlockLocation | null {
  for (let sectionIndex = 0; sectionIndex < doc.sections.length; sectionIndex++) {
    const section = doc.sections[sectionIndex]!
    for (let columnIndex = 0; columnIndex < section.columns.length; columnIndex++) {
      const column = section.columns[columnIndex]!
      const blockIndex = column.blocks.findIndex(block => block.id === blockId)
      if (blockIndex >= 0) {
        return {
          sectionIndex,
          columnIndex,
          blockIndex,
          section,
          column,
          block: column.blocks[blockIndex]!
        }
      }
    }
  }
  return null
}

function applyOne(doc: EmailDocumentV2, op: BlockOp): Array<BlockOp> {
  switch (op.op) {
    case 'add_section':
      return addSection(doc, op.index, op.section)
    case 'remove_section':
      return removeSection(doc, op.section_id)
    case 'move_section':
      return moveSection(doc, op.section_id, op.to_index)
    case 'set_section_layout':
      return setSectionLayout(doc, op.section_id, op.layout)
    case 'update_section':
      return updateSection(doc, op.section_id, op.params)
    case 'insert_blocks':
      return insertBlocks(doc, op.column_id, op.index, op.blocks)
    case 'update_block':
      return updateBlock(doc, op.block_id, op.params)
    case 'move_block':
      return moveBlock(doc, op.block_id, op.to_column_id, op.to_index)
    case 'remove_block':
      return removeBlock(doc, op.block_id)
    default:
      return []
  }
}

function addSection(doc: EmailDocumentV2, index: number, section: EmailSection): Array<BlockOp> {
  if (doc.sections.some(item => item.id === section.id)) return []
  const at = clamp(index, 0, doc.sections.length)
  doc.sections.splice(at, 0, JSON.parse(JSON.stringify(section)) as EmailSection)
  return [{ op: 'remove_section', section_id: section.id }]
}

function removeSection(doc: EmailDocumentV2, sectionId: string): Array<BlockOp> {
  const index = findSectionIndex(doc, sectionId)
  if (index < 0) return []
  const [section] = doc.sections.splice(index, 1)
  return [{ op: 'add_section', index, section: section! }]
}

function moveSection(doc: EmailDocumentV2, sectionId: string, toIndex: number): Array<BlockOp> {
  const from = findSectionIndex(doc, sectionId)
  if (from < 0) return []
  const [section] = doc.sections.splice(from, 1)
  const dest = clamp(toIndex, 0, doc.sections.length)
  doc.sections.splice(dest, 0, section!)
  if (dest === from) return []
  return [{ op: 'move_section', section_id: sectionId, to_index: from }]
}

function setSectionLayout(doc: EmailDocumentV2, sectionId: string, layout: EmailLayout): Array<BlockOp> {
  const index = findSectionIndex(doc, sectionId)
  if (index < 0) return []
  const section = doc.sections[index]!
  if (section.layout === layout && section.columns.length === columnCount(layout)) return []
  if (layout !== '100' && sectionHasRawHtml(section)) return []

  const nextCount = columnCount(layout)
  const shrinking = nextCount < section.columns.length
  const snapshot = shrinking ? JSON.parse(JSON.stringify(section)) as EmailSection : null
  const previousLayout = section.layout

  if (shrinking) {
    const kept = section.columns.slice(0, nextCount)
    const removed = section.columns.slice(nextCount)
    const last = kept[kept.length - 1]!
    for (const column of removed) last.blocks.push(...column.blocks)
    section.columns = kept
  } else if (nextCount > section.columns.length) {
    const used = collectDocIds(doc)
    while (section.columns.length < nextCount) {
      const id = newEmailId('col', used)
      section.columns.push({ id, blocks: [] })
    }
  }
  section.layout = layout

  if (snapshot) {
    return [
      { op: 'remove_section', section_id: sectionId },
      { op: 'add_section', index, section: snapshot }
    ]
  }
  return [{ op: 'set_section_layout', section_id: sectionId, layout: previousLayout }]
}

function updateSection(
  doc: EmailDocumentV2,
  sectionId: string,
  params: Partial<EmailSectionParams>
): Array<BlockOp> {
  const index = findSectionIndex(doc, sectionId)
  if (index < 0) return []
  const section = doc.sections[index]!
  const previous = mergeRecord(section.params as unknown as Record<string, unknown>, params as Record<string, unknown>)
  if (!previous) return []
  return [{ op: 'update_section', section_id: sectionId, params: previous as Partial<EmailSectionParams> }]
}

function insertBlocks(
  doc: EmailDocumentV2,
  columnId: string,
  index: number,
  blocks: Array<EmailV2Block>
): Array<BlockOp> {
  if (blocks.length === 0) return []
  const location = findColumn(doc, columnId)
  if (!location) return []
  if (location.section.layout !== '100' && blocks.some(block => block.type === 'raw_html')) return []
  const at = clamp(index, 0, location.column.blocks.length)
  const copies = blocks.map(block => JSON.parse(JSON.stringify(block)) as EmailV2Block)
  location.column.blocks.splice(at, 0, ...copies)
  return copies.map(block => ({ op: 'remove_block' as const, block_id: block.id })).reverse()
}

function updateBlock(doc: EmailDocumentV2, blockId: string, params: Record<string, unknown>): Array<BlockOp> {
  const location = findBlock(doc, blockId)
  if (!location) return []
  const previous = mergeRecord(location.block.params, params)
  if (!previous) return []
  return [{ op: 'update_block', block_id: blockId, params: previous }]
}

function moveBlock(
  doc: EmailDocumentV2,
  blockId: string,
  toColumnId: string,
  toIndex: number
): Array<BlockOp> {
  const source = findBlock(doc, blockId)
  const target = findColumn(doc, toColumnId)
  if (!source || !target) return []
  if (target.section.layout !== '100' && source.block.type === 'raw_html' && target.column.id !== source.column.id) {
    return []
  }
  if (source.column.id === target.column.id && source.blockIndex === toIndex) return []

  const fromColumnId = source.column.id
  const fromIndex = source.blockIndex
  const [block] = source.column.blocks.splice(fromIndex, 1)
  const destColumn = fromColumnId === target.column.id ? source.column : target.column
  const dest = clamp(toIndex, 0, destColumn.blocks.length)
  destColumn.blocks.splice(dest, 0, block!)
  if (fromColumnId === destColumn.id && dest === fromIndex) return []
  return [{
    op: 'move_block',
    block_id: blockId,
    to_column_id: fromColumnId,
    to_index: fromIndex
  }]
}

function removeBlock(doc: EmailDocumentV2, blockId: string): Array<BlockOp> {
  const location = findBlock(doc, blockId)
  if (!location) return []
  const [block] = location.column.blocks.splice(location.blockIndex, 1)
  return [{
    op: 'insert_blocks',
    column_id: location.column.id,
    index: location.blockIndex,
    blocks: [block!]
  }]
}

function mergeRecord(
  target: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> | null {
  const previous: Record<string, unknown> = {}
  let changed = false
  for (const key of Object.keys(patch)) {
    const nextValue = cloneValue(patch[key])
    const has = Object.prototype.hasOwnProperty.call(target, key)
    if (has && sameValue(target[key], nextValue)) continue
    changed = true
    previous[key] = has ? cloneValue(target[key]) : null
    target[key] = nextValue
  }
  return changed ? previous : null
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function cloneValue(value: unknown): unknown {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value)) as unknown
}

function collectDocIds(doc: EmailDocumentV2): Set<string> {
  const ids = new Set<string>()
  for (const section of doc.sections) {
    ids.add(section.id)
    for (const column of section.columns) {
      ids.add(column.id)
      for (const block of column.blocks) ids.add(block.id)
    }
  }
  return ids
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}
