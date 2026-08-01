import type { FilterEntityType } from '~/types/filter'

/** Morph keys selectable as automation trigger subjects. */
export type TriggerObjectType
  = | FilterEntityType
    | 'delinquency'
    | 'autopay_attempt'
    | 'payment'

export const BILLING_TRIGGER_TYPES = ['delinquency', 'autopay_attempt', 'payment'] as const

export type BillingTriggerType = (typeof BILLING_TRIGGER_TYPES)[number]

export function isBillingTriggerType(type: string): type is BillingTriggerType {
  return (BILLING_TRIGGER_TYPES as ReadonlyArray<string>).includes(type)
}

export function isFilterEntityType(type: string): type is FilterEntityType {
  return ['contact', 'deal', 'offer', 'reservation', 'unit', 'contract'].includes(type)
}
