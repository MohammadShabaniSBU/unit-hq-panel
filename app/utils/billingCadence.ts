import type { BillingInterval } from '~/types/contract'

export function formatBillingCadence(
  interval: BillingInterval,
  count: number,
  t: (key: string, params?: Record<string, unknown> | number) => string
): string {
  const unitLabel = t(`forms.contract.billingInterval.${interval}`, count)
  return t('forms.contract.billingCadence', { count, unit: unitLabel })
}
