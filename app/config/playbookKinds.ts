import type { NoticeType, PlaybookKind, PlaybookStepAction } from '~/types/playbook'

export interface PlaybookToken {
  path: string
  labelKey: string
}

export interface PlaybookKindConfig {
  kind: PlaybookKind
  route: string
  navLabelKey: string
  titleKey: string
  subtitleKey: string
  exitStatementKey: string
  howItWorksKey: string
  quietDealNoteKey?: string
  allowedActions: Array<PlaybookStepAction>
  noticePairing: boolean
  noticeTypes: Array<NoticeType>
  tokens: Array<PlaybookToken>
  filterFields: Array<'site_ids' | 'policy_ids' | 'min_days_overdue' | 'stages' | 'sources'>
}

const sharedTokens: Array<PlaybookToken> = [
  { path: 'contact.first_name', labelKey: 'playbooks.tokens.contactFirstName' },
  { path: 'contact.last_name', labelKey: 'playbooks.tokens.contactLastName' },
  { path: 'contact.name', labelKey: 'playbooks.tokens.contactName' },
  { path: 'contact.email', labelKey: 'playbooks.tokens.contactEmail' }
]

export const PLAYBOOK_KIND_CONFIGS: Record<PlaybookKind, PlaybookKindConfig> = {
  debt_process: {
    kind: 'debt_process',
    route: '/playbooks/debt-process',
    navLabelKey: 'nav.debtProcess',
    titleKey: 'playbooks.debt.title',
    subtitleKey: 'playbooks.debt.subtitle',
    exitStatementKey: 'playbooks.debt.exitStatement',
    howItWorksKey: 'playbooks.debt.howItWorks',
    allowedActions: ['send_email', 'send_sms', 'create_task', 'record_notice'],
    noticePairing: true,
    noticeTypes: ['payment_reminder', 'overdue', 'final_demand', 'retention'],
    tokens: [
      ...sharedTokens,
      { path: 'contract.balance_owed', labelKey: 'playbooks.tokens.balanceOwed' },
      { path: 'pay_link', labelKey: 'playbooks.tokens.payLink' }
    ],
    filterFields: ['site_ids', 'policy_ids', 'min_days_overdue']
  },
  lead_chase: {
    kind: 'lead_chase',
    route: '/playbooks/lead-chase',
    navLabelKey: 'nav.leadChase',
    titleKey: 'playbooks.lead.title',
    subtitleKey: 'playbooks.lead.subtitle',
    exitStatementKey: 'playbooks.lead.exitStatement',
    howItWorksKey: 'playbooks.lead.howItWorks',
    quietDealNoteKey: 'playbooks.lead.quietDealNote',
    allowedActions: ['send_email', 'send_sms', 'create_task'],
    noticePairing: false,
    noticeTypes: [],
    tokens: [
      ...sharedTokens,
      { path: 'deal.status', labelKey: 'playbooks.tokens.dealStatus' }
    ],
    filterFields: ['site_ids', 'stages', 'sources']
  }
}

export function playbookKindConfig(kind: PlaybookKind): PlaybookKindConfig {
  return PLAYBOOK_KIND_CONFIGS[kind]
}

export function actionIcon(action: PlaybookStepAction): string {
  switch (action) {
    case 'send_email':
      return 'i-lucide-mail'
    case 'send_sms':
      return 'i-lucide-message-square'
    case 'create_task':
      return 'i-lucide-square-check-big'
    case 'record_notice':
      return 'i-lucide-file-text'
    default:
      return 'i-lucide-circle'
  }
}
