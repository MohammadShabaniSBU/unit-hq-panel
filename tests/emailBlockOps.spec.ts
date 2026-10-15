import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'bun:test'
import type { EmailDocumentV2, EmailLayout, EmailV2Block } from '../app/types/email-block-document'
import { applyOps, type BlockOp } from '../app/utils/emailBlockOps'

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/email-blocks/v2/valid')
const layouts: Array<EmailLayout> = ['100', '50_50', '33_67', '67_33', '33_33_33']

function loadFixtures(): Array<EmailDocumentV2> {
  return readdirSync(fixtureDir)
    .filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(readFileSync(resolve(fixtureDir, name), 'utf8')) as EmailDocumentV2)
}

function roundTrip(doc: EmailDocumentV2, ops: Array<BlockOp>) {
  const forward = applyOps(structuredClone(doc), ops)
  const back = applyOps(forward.doc, forward.inverse)
  expect(back.doc).toEqual(doc)
}

function sampleSection() {
  return {
    id: 'sec_0a0a0a0a',
    layout: '100' as const,
    params: { background_color: null, padding: 'md' as const, stack_on_mobile: true },
    columns: [{
      id: 'col_0b0b0b0b',
      blocks: [] as Array<EmailV2Block>
    }]
  }
}

function paragraph(id: string, html: string): EmailV2Block {
  return { id, type: 'paragraph', params: { html } }
}

describe('emailBlockOps', () => {
  const fixtures = loadFixtures()

  it('inverse_round_trip', () => {
    expect(fixtures.length).toBeGreaterThan(0)
    for (const doc of fixtures) {
      roundTrip(doc, [{ op: 'add_section', index: 0, section: sampleSection() }])
      const section = doc.sections[0]
      if (!section) continue
      roundTrip(doc, [{ op: 'remove_section', section_id: section.id }])
      roundTrip(doc, [{ op: 'move_section', section_id: section.id, to_index: 0 }])
      roundTrip(doc, [{ op: 'move_section', section_id: section.id, to_index: doc.sections.length }])
      for (const layout of layouts) {
        roundTrip(doc, [{ op: 'set_section_layout', section_id: section.id, layout }])
      }
      const padding = section.params.padding === 'sm' ? 'lg' : 'sm'
      roundTrip(doc, [{ op: 'update_section', section_id: section.id, params: { padding } }])
      const column = section.columns[0]
      if (!column) continue
      roundTrip(doc, [{
        op: 'insert_blocks',
        column_id: column.id,
        index: 0,
        blocks: [paragraph('blk_0c0c0c0c', '<p>Added</p>')]
      }])
      const block = column.blocks[0]
      if (block) {
        const textKey = Object.keys(block.params).find(key => typeof block.params[key] === 'string')
        if (textKey) {
          roundTrip(doc, [{
            op: 'update_block',
            block_id: block.id,
            params: { [textKey]: `${String(block.params[textKey])}!` }
          }])
        }
        roundTrip(doc, [{
          op: 'move_block',
          block_id: block.id,
          to_column_id: column.id,
          to_index: column.blocks.length
        }])
        const other = section.columns[1]
        if (other) {
          roundTrip(doc, [{
            op: 'move_block',
            block_id: block.id,
            to_column_id: other.id,
            to_index: other.blocks.length
          }])
        }
        roundTrip(doc, [{ op: 'remove_block', block_id: block.id }])
      }
    }
  })

  it('shrink_layout_moves_blocks', () => {
    const sideBySide: EmailDocumentV2 = {
      version: 2,
      settings: { background_color: null },
      sections: [{
        id: 'sec_aaaaaaaa',
        layout: '50_50',
        params: { background_color: null, padding: 'md', stack_on_mobile: true },
        columns: [
          { id: 'col_bbbbbbb1', blocks: [paragraph('blk_ccccccc1', '<p>A</p>')] },
          { id: 'col_bbbbbbb2', blocks: [paragraph('blk_ccccccc2', '<p>B</p>')] }
        ]
      }]
    }
    const shrunk = applyOps(sideBySide, [{
      op: 'set_section_layout',
      section_id: 'sec_aaaaaaaa',
      layout: '100'
    }])
    expect(shrunk.doc.sections[0]?.layout).toBe('100')
    expect(shrunk.doc.sections[0]?.columns).toHaveLength(1)
    expect(shrunk.doc.sections[0]?.columns[0]?.id).toBe('col_bbbbbbb1')
    expect(shrunk.doc.sections[0]?.columns[0]?.blocks.map(block => block.id)).toEqual([
      'blk_ccccccc1',
      'blk_ccccccc2'
    ])
    roundTrip(sideBySide, [{ op: 'set_section_layout', section_id: 'sec_aaaaaaaa', layout: '100' }])

    const thirds: EmailDocumentV2 = {
      version: 2,
      sections: [{
        id: 'sec_dddddddd',
        layout: '33_33_33',
        params: { background_color: null, padding: 'md', stack_on_mobile: true },
        columns: [
          { id: 'col_eeeeeee1', blocks: [paragraph('blk_fffffff1', '<p>1</p>')] },
          { id: 'col_eeeeeee2', blocks: [paragraph('blk_fffffff2', '<p>2</p>')] },
          { id: 'col_eeeeeee3', blocks: [paragraph('blk_fffffff3', '<p>3</p>')] }
        ]
      }]
    }
    const stacked = applyOps(thirds, [{
      op: 'set_section_layout',
      section_id: 'sec_dddddddd',
      layout: '100'
    }])
    expect(stacked.doc.sections[0]?.columns[0]?.blocks.map(block => block.id)).toEqual([
      'blk_fffffff1',
      'blk_fffffff2',
      'blk_fffffff3'
    ])
    roundTrip(thirds, [{ op: 'set_section_layout', section_id: 'sec_dddddddd', layout: '100' }])
  })
})
