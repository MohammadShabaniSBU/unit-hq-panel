import type {
  EmailColumn,
  EmailDocumentV2,
  EmailLayout,
  EmailSection,
  EmailV2Block
} from '../types/email-block-document'

export interface EmailDocumentV1 {
  version: 1
  blocks: Array<{
    id: string
    type: string
    params?: Record<string, unknown>
  }>
}

const BLOCK_ID = /^blk_[0-9a-f]{8}$/

export function emptyEmailDocument(): EmailDocumentV2 {
  return {
    version: 2,
    settings: { background_color: null },
    sections: []
  }
}

export function columnCount(layout: EmailLayout): number {
  if (layout === '100') return 1
  if (layout === '33_33_33') return 3
  return 2
}

export function collectIds(doc: EmailDocumentV2): Set<string> {
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

export function newEmailId(prefix: 'sec' | 'col' | 'blk', used?: Set<string>): string {
  const taken = used ?? new Set<string>()
  while (true) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
    const id = `${prefix}_${hex}`
    if (!taken.has(id)) {
      taken.add(id)
      return id
    }
  }
}

export function createSection(
  layout: EmailLayout,
  used: Set<string>,
  blocksInFirst: Array<EmailV2Block> = []
): EmailSection {
  const columns: Array<EmailColumn> = []
  const count = columnCount(layout)
  for (let index = 0; index < count; index++) {
    columns.push({
      id: newEmailId('col', used),
      blocks: index === 0 ? blocksInFirst : []
    })
  }
  return {
    id: newEmailId('sec', used),
    layout,
    params: {
      background_color: null,
      padding: 'md',
      stack_on_mobile: true
    },
    columns
  }
}

export function duplicateSection(section: EmailSection, used: Set<string>): EmailSection {
  const copy = JSON.parse(JSON.stringify(section)) as EmailSection
  copy.id = newEmailId('sec', used)
  copy.columns = copy.columns.map(column => ({
    id: newEmailId('col', used),
    blocks: column.blocks.map(block => ({
      ...block,
      id: newEmailId('blk', used)
    }))
  }))
  return copy
}

export function sectionHasRawHtml(section: EmailSection): boolean {
  return section.columns.some(column => column.blocks.some(block => block.type === 'raw_html'))
}

export function countEmailBlocks(doc: EmailDocumentV2): number {
  let total = 0
  for (const section of doc.sections) {
    for (const column of section.columns) total += column.blocks.length
  }
  return total
}

/**
 * Pure v1 to v2 conversion. Mirrors EmailBlockDocument::upcast.
 * One full-width section, one column, blocks in order. Does not mutate the input.
 */
export function upcastV1(v1: EmailDocumentV1): EmailDocumentV2 {
  const source = Array.isArray(v1.blocks) ? v1.blocks : []
  const used = new Set<string>()
  const blocks: Array<EmailV2Block> = []
  let firstOriginalId = ''

  for (const block of source) {
    const oldId = String(block.id ?? '')
    if (firstOriginalId === '' && oldId !== '') firstOriginalId = oldId
    blocks.push({
      id: derivedId('blk', oldId, used, true),
      type: String(block.type ?? ''),
      params: block.params && typeof block.params === 'object' ? structuredClone(block.params) : {}
    })
  }

  return {
    version: 2,
    settings: { background_color: null },
    sections: [{
      id: derivedId('sec', firstOriginalId, used, false),
      layout: '100',
      params: {
        background_color: null,
        padding: 'md',
        stack_on_mobile: true
      },
      columns: [{
        id: derivedId('col', firstOriginalId, used, false),
        blocks
      }]
    }]
  }
}

export function emailDocumentFromVariant(blocks: unknown): EmailDocumentV2 {
  if (!blocks || typeof blocks !== 'object') return emptyEmailDocument()
  const doc = blocks as { version?: unknown, sections?: unknown, blocks?: unknown }
  if (doc.version === 2 && Array.isArray(doc.sections)) {
    const next = structuredClone(doc) as EmailDocumentV2
    if (!next.settings) next.settings = { background_color: null }
    for (const section of next.sections) {
      if (section.params.stack_on_mobile === undefined) {
        section.params.stack_on_mobile = true
      }
    }
    return next
  }
  if (doc.version === 1 && Array.isArray(doc.blocks)) {
    return upcastV1({
      version: 1,
      blocks: doc.blocks as EmailDocumentV1['blocks']
    })
  }
  return emptyEmailDocument()
}

function derivedId(
  prefix: 'sec' | 'col' | 'blk',
  seed: string,
  used: Set<string>,
  keepWhenValid: boolean
): string {
  if (keepWhenValid && BLOCK_ID.test(seed) && !used.has(seed)) {
    used.add(seed)
    return seed
  }

  let n = 0
  while (true) {
    const salt = n === 0 ? `${prefix}:${seed}` : `${prefix}:${seed}:${n}`
    const id = `${prefix}_${sha1Hex(salt).slice(0, 8)}`
    n++
    if (!used.has(id)) {
      used.add(id)
      return id
    }
  }
}

export function sha1Hex(input: string): string {
  const msg = new TextEncoder().encode(input)
  const bitLen = msg.length * 8
  const withPad = new Uint8Array(((msg.length + 9 + 63) >> 6) << 6)
  withPad.set(msg)
  withPad[msg.length] = 0x80
  const view = new DataView(withPad.buffer)
  view.setUint32(withPad.length - 4, bitLen, false)

  let h0 = 0x67452301
  let h1 = 0xEFCDAB89
  let h2 = 0x98BADCFE
  let h3 = 0x10325476
  let h4 = 0xC3D2E1F0
  const w = new Uint32Array(80)

  for (let offset = 0; offset < withPad.length; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + (t * 4), false)
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!
      w[t] = ((x << 1) | (x >>> 31)) >>> 0
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let t = 0; t < 80; t++) {
      let f: number
      let k: number
      if (t < 20) {
        f = (b & c) | (~b & d)
        k = 0x5A827999
      } else if (t < 40) {
        f = b ^ c ^ d
        k = 0x6ED9EBA1
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8F1BBCDC
      } else {
        f = b ^ c ^ d
        k = 0xCA62C1D6
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]!) >>> 0
      e = d
      d = c
      c = ((b << 30) | (b >>> 2)) >>> 0
      b = a
      a = temp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  return [h0, h1, h2, h3, h4].map(part => part.toString(16).padStart(8, '0')).join('')
}
