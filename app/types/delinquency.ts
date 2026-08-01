export type DelinquencyPolicyAction
  = 'assess_late_fee'
    | 'place_overlock'
    | 'release_overlock'
    | 'record_notice'
    | 'create_task'
    | 'revoke_access'

export type LateFeeType = 'flat' | 'percent'

export type NoticeType
  = 'payment_reminder'
    | 'overdue'
    | 'final_demand'
    | 'retention'

export interface AssessLateFeeParams {
  type: LateFeeType
  amount?: string
  percent?: string
  cap_per_case?: string
}

export interface RecordNoticeParams {
  notice_type: NoticeType
}

export interface CreateTaskParams {
  title_key: string
  urgent: boolean
}

export type DelinquencyStepParams
  = AssessLateFeeParams
    | RecordNoticeParams
    | CreateTaskParams
    | Record<string, never>

export interface ApiDelinquencyPolicyStep {
  id?: number
  offset_days: number
  action: DelinquencyPolicyAction
  params: DelinquencyStepParams
  sort: number
}

export interface ApiDelinquencyPolicy {
  id: number
  name: string
  auto_release_overlock: boolean
  sites_count?: number
  steps: Array<ApiDelinquencyPolicyStep>
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiDelinquencyFiscalFlags {
  late_fee_tax: string
  invoice_late_fees: boolean
}

export interface ApiDelinquencyPoliciesPayload {
  policies: Array<ApiDelinquencyPolicy>
  fiscal: ApiDelinquencyFiscalFlags
}

export type DelinquencyPolicyListStatus = 'active' | 'archived' | 'all'
