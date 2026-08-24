/**
 * Mirror of App\Support\Auth\Permission (unit-hq-api).
 * Keep in sync — task 06 coverage test fails on drift.
 */
export enum Permission {
  ContactView = 'contact.view',
  ContactManage = 'contact.manage',
  DealManage = 'deal.manage',
  OfferManage = 'offer.manage',
  OfferSend = 'offer.send',
  ReservationManage = 'reservation.manage',
  ContractView = 'contract.view',
  ContractSign = 'contract.sign',
  ContractVacate = 'contract.vacate',
  ContractTransfer = 'contract.transfer',
  ContractRateChange = 'contract.rate_change',

  UnitView = 'unit.view',
  UnitManage = 'unit.manage',
  UnitHoldManage = 'unit.hold.manage',
  SiteManage = 'site.manage',
  CatalogueManage = 'catalogue.manage',

  InvoiceView = 'invoice.view',
  InvoiceIssue = 'invoice.issue',
  InvoiceRectify = 'invoice.rectify',
  PaymentView = 'payment.view',
  PaymentRecord = 'payment.record',
  PaymentRefund = 'payment.refund',
  BillingRunExecute = 'billing.run.execute',
  BillingSettingsManage = 'billing.settings.manage',
  TaxRateManage = 'tax.rate.manage',
  LegalEntityManage = 'legal_entity.manage',

  DelinquencyView = 'delinquency.view',
  DelinquencyAct = 'delinquency.act',
  DelinquencyWriteOff = 'delinquency.write_off',

  InboxView = 'inbox.view',
  InboxSend = 'inbox.send',
  InboxAssign = 'inbox.assign',
  CallPlace = 'call.place',
  TemplateManage = 'template.manage',

  AutomationView = 'automation.view',
  AutomationManage = 'automation.manage',
  PlaybookManage = 'playbook.manage',
  AccessView = 'access.view',
  AccessManage = 'access.manage',
  EsignSend = 'esign.send',

  AiSummaryView = 'ai_summary.view',
  AiSummaryGenerate = 'ai_summary.generate',
  AiAgentUse = 'ai_agent.use',
  AgentActionApprove = 'agent_action.approve',
  CopilotVoiceUse = 'copilot_voice.use',

  ReportView = 'report.view',
  ReportFinancialView = 'report.financial.view',
  ActivityView = 'activity.view',
  CredentialManage = 'credential.manage',
  SettingsManage = 'settings.manage',
  RbacManage = 'rbac.manage'
}

export type PermissionValue = `${Permission}`

/** PATCH overview entity → same permission as RoutePermissions. */
export const OVERVIEW_EDIT_PERMISSION: Record<string, Permission> = {
  contact: Permission.ContactManage,
  deal: Permission.DealManage,
  offer: Permission.OfferManage,
  reservation: Permission.ReservationManage,
  contract: Permission.ContractSign,
  unit: Permission.UnitManage
}
