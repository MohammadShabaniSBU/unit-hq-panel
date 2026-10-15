import { describe, expect, it } from 'bun:test'
import { ref } from 'vue'
import type { EmailDocumentV2 } from '../app/types/email-block-document'
import { useEditorHistory } from '../app/composables/useEditorHistory'

function docWithParagraph(text: string): EmailDocumentV2 {
  return {
    version: 2,
    settings: { background_color: null },
    sections: [{
      id: 'sec_11111111',
      layout: '100',
      params: { background_color: null, padding: 'md', stack_on_mobile: true },
      columns: [{
        id: 'col_22222222',
        blocks: [{ id: 'blk_33333333', type: 'heading', params: { text, level: 2 } }]
      }]
    }]
  }
}

function textOf(doc: EmailDocumentV2): string {
  return String(doc.sections[0]?.columns[0]?.blocks[0]?.params.text)
}

describe('useEditorHistory', () => {
  it('coalesces_typing', () => {
    let time = 1_000_000
    const doc = ref(docWithParagraph('Rate'))
    const history = useEditorHistory(doc, { now: () => time })

    function type(value: string) {
      history.commit(
        [{ op: 'update_block', block_id: 'blk_33333333', params: { text: value } }],
        'update_block',
        { key: 'blk_33333333:text' }
      )
    }

    type('Rate ')
    time += 200
    type('Rate o')
    time += 200
    type('Rate old')
    expect(history.undoStack.value).toHaveLength(1)
    expect(textOf(doc.value)).toBe('Rate old')

    history.undo()
    expect(textOf(doc.value)).toBe('Rate')
    history.redo()
    expect(textOf(doc.value)).toBe('Rate old')

    time += 1000
    type('Rate new')
    expect(history.undoStack.value).toHaveLength(2)

    history.commit(
      [{ op: 'update_block', block_id: 'blk_33333333', params: { level: 1 } }],
      'update_block',
      { key: 'blk_33333333:level' }
    )
    expect(history.undoStack.value).toHaveLength(3)
  })
})
