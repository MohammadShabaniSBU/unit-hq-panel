import { createHash } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import { sha1Hex, upcastV1 } from '../app/utils/emailBlocks'

describe('emailBlocks', () => {
  it('sha1 matches node', () => {
    expect(sha1Hex('abc')).toBe(createHash('sha1').update('abc').digest('hex'))
  })

  it('upcast_matches_php', () => {
    const v1 = {
      version: 1 as const,
      blocks: [
        { id: 'p1', type: 'paragraph', params: { html: '<p>Hi</p>' } },
        { id: 'blk_abcdef12', type: 'divider', params: {} }
      ]
    }
    const doc = upcastV1(v1)
    expect(doc.version).toBe(2)
    expect(doc.settings).toEqual({ background_color: null })
    expect(doc.sections[0]?.layout).toBe('100')
    expect(doc.sections[0]?.params).toEqual({
      background_color: null,
      padding: 'md',
      stack_on_mobile: true
    })
    const blocks = doc.sections[0]?.columns[0]?.blocks ?? []
    expect(blocks[0]?.id).toBe(`blk_${createHash('sha1').update('blk:p1').digest('hex').slice(0, 8)}`)
    expect(blocks[0]?.type).toBe('paragraph')
    expect(blocks[0]?.params).toEqual({ html: '<p>Hi</p>' })
    expect(blocks[1]?.id).toBe('blk_abcdef12')
    expect(doc.sections[0]?.id).toBe(`sec_${createHash('sha1').update('sec:p1').digest('hex').slice(0, 8)}`)
    expect(doc.sections[0]?.columns[0]?.id).toBe(`col_${createHash('sha1').update('col:p1').digest('hex').slice(0, 8)}`)
    expect(upcastV1(v1)).toEqual(doc)
    expect(v1.blocks[0]?.id).toBe('p1')

    const empty = upcastV1({ version: 1, blocks: [] })
    expect(empty.sections[0]?.id).toBe(`sec_${createHash('sha1').update('sec:').digest('hex').slice(0, 8)}`)
    expect(empty.sections[0]?.columns[0]?.id).toBe(`col_${createHash('sha1').update('col:').digest('hex').slice(0, 8)}`)
    expect(empty.sections[0]?.columns[0]?.blocks).toEqual([])
  })
})
