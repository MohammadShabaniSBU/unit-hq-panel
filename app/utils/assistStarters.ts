import type { EmailDocumentV2, EmailSelection } from '../types/email-builder'
import { blockLabelKey } from '../types/email-builder'
import { findBlock, findColumn, findSectionIndex } from './emailBlockOps'

const SYSTEM_STARTERS: Array<string> = [
  'templates.builder.assistant.starters.moveInWelcome',
  'templates.builder.assistant.starters.rateIncreaseNotice',
  'templates.builder.assistant.starters.moveOutConfirmation',
  'templates.builder.assistant.starters.accessCodeReminder'
]

const MARKETING_STARTERS: Array<string> = [
  'templates.builder.assistant.starters.seasonalPromotion',
  'templates.builder.assistant.starters.monthlyNewsletter'
]

export function starterKeysForPurpose(purpose: string): Array<string> {
  switch (purpose) {
    case 'debt':
      return [
        'templates.builder.assistant.starters.friendlyPaymentReminder',
        'templates.builder.assistant.starters.overdueNotice',
        'templates.builder.assistant.starters.finalNoticeBeforeLien'
      ]
    case 'lead':
      return [
        'templates.builder.assistant.starters.followUpAfterEnquiry',
        'templates.builder.assistant.starters.offerStillAvailable'
      ]
    case 'offer':
      return ['templates.builder.assistant.starters.offerReady']
    case 'marketing':
    case 'newsletter':
      return MARKETING_STARTERS
    case 'announcement':
      return [
        'templates.builder.assistant.starters.holidayHours',
        'templates.builder.assistant.starters.facilityMaintenance'
      ]
    default:
      return SYSTEM_STARTERS
  }
}

export interface SelectionChipParts {
  section: number
  column: number | null
  blockLabelKey: string | null
}

export function selectionChipParts(
  doc: EmailDocumentV2,
  selection: EmailSelection
): SelectionChipParts | null {
  if (selection.kind === 'section') {
    const index = findSectionIndex(doc, selection.id)
    if (index < 0) return null
    return { section: index + 1, column: null, blockLabelKey: null }
  }

  if (selection.kind === 'column') {
    const location = findColumn(doc, selection.id)
    if (!location) return null
    return {
      section: location.sectionIndex + 1,
      column: location.columnIndex + 1,
      blockLabelKey: null
    }
  }

  const location = findBlock(doc, selection.id)
  if (!location) return null
  const level = location.block.params.level
  return {
    section: location.sectionIndex + 1,
    column: location.columnIndex + 1,
    blockLabelKey: blockLabelKey(
      location.block.type,
      typeof level === 'number' ? { level } : undefined
    )
  }
}
