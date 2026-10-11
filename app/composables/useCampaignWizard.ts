import type { CalendarDate, Time } from '@internationalized/date'
import type { InjectionKey } from 'vue'
import type { ApiTemplateFamily } from '~/types/email-builder'
import type { FilterCondition, FilterGroup, FilterSchemaField } from '~/types/filter'
import type {
  AudiencePreview,
  Campaign,
  CampaignChannelName,
  CampaignContentPreview,
  CampaignTypeName,
  FieldErrors
} from '~/types/campaign'
import type { Segment } from '~/types/segment'

export const CAMPAIGN_NAME_MAX = 160

export interface CampaignListOption {
  id: number
  key: string
  kind: string
  labels: Record<string, string>
  channels: Array<string>
  member_counts?: Record<string, number>
}

export type SegmentMode = 'whole' | 'saved' | 'new'

export interface WizardCheck {
  key: 'named' | 'audience' | 'content' | 'schedule' | 'test'
  pass: boolean
  optional: boolean
}

export interface WizardWeekDay {
  key: string
  label: string
  date: number
  active: boolean
}

export interface WizardReach {
  listLabel: string
  listCount: number | null
  ruleCount: number | null
  finalCount: number | null
}

export interface CampaignWizardContext {
  type: CampaignTypeName
  campaign: Campaign | null
  step: number
  maxReached: number
  saving: boolean
  testing: boolean
  errors: FieldErrors
  warnings: Array<string>
  name: string
  listId: number | null
  segmentId: number | null
  segmentMode: SegmentMode
  siteIds: Array<number>
  emailOn: boolean
  smsOn: boolean
  emailFamilyId: number | null
  smsFamilyId: number | null
  subject: string
  scheduleMode: 'now' | 'later'
  scheduledDate: CalendarDate | null
  scheduledTime: Time | null
  urgent: boolean
  urgentConfirmed: boolean
  segmentName: string
  segmentError: string
  testChannel: CampaignChannelName
  testTo: Array<string>
  testInput: string
  testSent: boolean
  myEmail: string
  segments: Array<Segment>
  siteChoices: Array<{ id: number, label: string }>
  listItems: Array<{ label: string, value: number }>
  segmentItems: Array<{ label: string, value: number }>
  emailItems: Array<{ label: string, value: number }>
  smsItems: Array<{ label: string, value: number }>
  emailFamilies: Array<ApiTemplateFamily>
  smsFamilies: Array<ApiTemplateFamily>
  filterFields: Array<FilterSchemaField>
  filterSchemaPending: boolean
  workingFilter: FilterGroup | null
  canManageSegments: boolean
  audience: AudiencePreview | null
  rendered: CampaignContentPreview | null
  safeHtml: string
  skipRows: Array<[string, number]>
  reach: WizardReach
  summaries: Array<string>
  checks: Array<WizardCheck>
  requiredChecksPassed: number
  canSubmit: boolean
  submitLabel: string
  submitHint: string
  scheduleHeadline: string
  scheduleRelative: string
  weekDays: Array<WizardWeekDay>
  dateFieldLocale: string
  contentSummary: string
  contentDetail: string
  audienceSummary: string
  audienceDetail: string
  fieldError: (field: string) => string | undefined
  toggleSite: (id: number) => void
  onNext: () => Promise<void>
  onBack: () => void
  onCancel: () => void
  goTo: (index: number) => void
  onSubmit: () => Promise<void>
  onTestSend: () => Promise<void>
  addTestRecipient: () => void
  removeTestRecipient: (value: string) => void
  conditionAt: (index: number) => FilterCondition | null
  groupAt: (index: number) => FilterGroup | null
  setCondition: (index: number, next: FilterCondition) => void
  setGroup: (index: number, next: FilterGroup) => void
  removeRootNode: (index: number) => void
  addConditionToGroup: (group: FilterGroup) => void
  removeNode: (group: FilterGroup, index: number) => void
  addRootCondition: () => void
  addRootGroup: () => void
  setRootOp: (op: 'and' | 'or') => void
}

export const CampaignWizardKey: InjectionKey<CampaignWizardContext> = Symbol('campaign-wizard')

export function useCampaignWizard(): CampaignWizardContext {
  const wizard = inject(CampaignWizardKey)
  if (!wizard) {
    throw new Error('useCampaignWizard must be used inside the campaign wizard')
  }
  return wizard
}
