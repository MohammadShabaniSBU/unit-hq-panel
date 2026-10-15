import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'bun:test'
import { ref } from 'vue'
import type { EmailDocumentV2, EmailSection } from '../app/types/email-block-document'
import { useEditorHistory } from '../app/composables/useEditorHistory'
import { applyPlanned, planAssistApply, unwrapTurnOps, type StoredTurnOp } from '../app/utils/assistApply'
import { canonicalHash } from '../app/utils/canonicalJson'

const turnsDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/template-assist/turns')

interface TurnFixture {
  base_document: EmailDocumentV2
  working_document: EmailDocumentV2
  ops: Array<StoredTurnOp>
  status: string
}

function loadTurn(name: string): TurnFixture {
  return JSON.parse(readFileSync(resolve(turnsDir, name), 'utf8')) as TurnFixture
}

function sectionWithParagraph(html: string): EmailSection {
  return {
    id: 'sec_11111111',
    layout: '100',
    params: { background_color: null, padding: 'md', stack_on_mobile: true },
    columns: [{
      id: 'col_22222222',
      blocks: [{ id: 'blk_33333333', type: 'paragraph', params: { html } }]
    }]
  }
}

function addedSection(): EmailSection {
  return {
    id: 'sec_aaaaaaaa',
    layout: '100',
    params: { background_color: null, padding: 'md', stack_on_mobile: true },
    columns: [{ id: 'col_bbbbbbbb', blocks: [] }]
  }
}

describe('assistApply', () => {
  it('fast_path_hash_match', async () => {
    const fixture = loadTurn('empty-rate-increase.json')
    const hash = await canonicalHash(fixture.base_document)
    const ops = unwrapTurnOps(fixture.ops)
    const plan = planAssistApply(fixture.base_document, ops, hash === await canonicalHash(fixture.base_document))
    expect(plan.outcome).toBe('apply')
    if (plan.outcome !== 'apply') return
    const applied = applyPlanned(structuredClone(fixture.base_document), plan)
    if (applied == null) throw new Error('expected an applied document')
    expect(applied.doc).toEqual(fixture.working_document)
  })

  it('rebase_skips_missing_targets', () => {
    const current: EmailDocumentV2 = {
      version: 2,
      settings: { background_color: null },
      sections: []
    }
    const before = structuredClone(current)
    const plan = planAssistApply(current, [{
      op: 'update_block',
      block_id: 'blk_33333333',
      params: { html: '<p>Updated</p>' }
    }], false)
    expect(plan.outcome).toBe('conflict')
    expect(applyPlanned(current, plan) == null).toBe(true)
    expect(current).toEqual(before)
  })

  it('one_history_entry_per_turn', () => {
    const fixture = loadTurn('empty-rate-increase.json')
    const doc = ref(structuredClone(fixture.base_document))
    const subject = ref('Old subject')
    const history = useEditorHistory(doc)
    const ops = unwrapTurnOps(fixture.ops)
    const subjectBefore = subject.value
    subject.value = 'Rate notice'
    const committed = history.commit(ops, 'assistant', undefined, {
      source: 'assistant',
      turnId: 4,
      subjectBefore,
      subjectAfter: subject.value
    })
    expect(committed).toBe(true)
    expect(history.undoStack.value).toHaveLength(1)
    expect(doc.value).toEqual(fixture.working_document)

    const undone = history.undo()
    expect(undone?.source).toBe('assistant')
    expect(undone?.turnId).toBe(4)
    if (undone?.subjectBefore != null) subject.value = undone.subjectBefore
    expect(doc.value).toEqual(fixture.base_document)
    expect(subject.value).toBe('Old subject')

    const redone = history.redo()
    if (redone?.subjectAfter != null) subject.value = redone.subjectAfter
    expect(doc.value).toEqual(fixture.working_document)
    expect(subject.value).toBe('Rate notice')
    expect(history.undoStack.value).toHaveLength(1)
  })

  it('manual paragraph edit survives an added section', () => {
    const base: EmailDocumentV2 = {
      version: 2,
      settings: { background_color: null },
      sections: [sectionWithParagraph('<p>Hello</p>')]
    }
    const edited = structuredClone(base)
    edited.sections[0]!.columns[0]!.blocks[0]!.params.html = '<p>Hello friend</p>'
    const plan = planAssistApply(edited, [{
      op: 'add_section',
      index: 1,
      section: addedSection()
    }], false)
    expect(plan.outcome).toBe('apply')
    if (plan.outcome !== 'apply') return
    const applied = applyPlanned(edited, plan)
    if (applied == null) throw new Error('expected an applied document')
    expect(applied.doc.sections).toHaveLength(2)
    expect(applied.doc.sections[0]!.columns[0]!.blocks[0]!.params.html).toBe('<p>Hello friend</p>')
    expect(applied.doc.sections[1]!.id).toBe('sec_aaaaaaaa')
  })

  it('deleted section opens a conflict and keep mine leaves the canvas', () => {
    const current: EmailDocumentV2 = {
      version: 2,
      settings: { background_color: null },
      sections: []
    }
    const snapshot = structuredClone(current)
    const plan = planAssistApply(current, [{
      op: 'update_block',
      block_id: 'blk_33333333',
      params: { html: '<p>From the assistant</p>' }
    }], false)
    expect(plan.outcome).toBe('conflict')
    if (plan.outcome === 'conflict') {
      expect(current).toEqual(snapshot)
    }
  })

  const fixtureNames = [
    'empty-rate-increase.json',
    'follow-up-tone.json',
    'layout-change.json',
    'selection-scoped.json',
    'budget-exhausted.json',
    'failed-token.json'
  ]

  for (const name of fixtureNames) {
    it(`fixture ${name} applies onto its base`, () => {
      const fixture = loadTurn(name)
      const plan = planAssistApply(fixture.base_document, unwrapTurnOps(fixture.ops), true)
      expect(plan.outcome).toBe('apply')
      if (plan.outcome !== 'apply') return
      const applied = applyPlanned(structuredClone(fixture.base_document), plan)
      if (applied == null) throw new Error('expected an applied document')
      expect(applied.doc).toEqual(fixture.working_document)
    })
  }
})
