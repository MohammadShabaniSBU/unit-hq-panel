import type { TriggerObjectType } from '~/types/trigger'

export type TriggerObjectTypeItem
  = | { type: 'label', label: string }
    | { label: string, value: TriggerObjectType }

/**
 * Grouped object-type items for trigger pickers (CRM + Billing).
 * @param includePayment — false for object_updated (payments are create-only)
 */
export function useTriggerObjectTypeOptions(includePayment: MaybeRefOrGetter<boolean> = true) {
  const { t } = useI18n()

  const items = computed<Array<TriggerObjectTypeItem>>(() => {
    const list: Array<TriggerObjectTypeItem> = [
      { type: 'label', label: t('automations.triggers.groups.crm') },
      { label: t('automations.triggers.crm.contact'), value: 'contact' },
      { label: t('automations.triggers.crm.deal'), value: 'deal' },
      { label: t('automations.triggers.crm.unit'), value: 'unit' },
      { label: t('automations.triggers.crm.contract'), value: 'contract' },
      { label: t('automations.triggers.crm.reservation'), value: 'reservation' },
      { type: 'label', label: t('automations.triggers.groups.billing') },
      { label: t('automations.triggers.billing.delinquency'), value: 'delinquency' },
      { label: t('automations.triggers.billing.autopay_attempt'), value: 'autopay_attempt' }
    ]

    if (toValue(includePayment)) {
      list.push({ label: t('automations.triggers.billing.payment'), value: 'payment' })
    }

    return list
  })

  return { items }
}
