import type { ApiBillingSettings } from '~/types/settings'
import { formatMoney } from '~/composables/useMoney'
import { formatBillingCadence } from '~/utils/billingCadence'

export function useOrgBillingCadence() {
  const { t } = useI18n()
  const { get } = useApi()

  const { data } = useAsyncData(
    'settings-billing',
    () => get<ApiBillingSettings>('/api/settings/billing')
  )

  const settings = computed(() => data.value?.data ?? null)

  const cadenceLabel = computed(() => {
    if (!settings.value) {
      return ''
    }

    return formatBillingCadence(
      settings.value.default_billing_interval,
      settings.value.default_billing_interval_count,
      t
    )
  })

  function formatMoneyWithCadence(amount: string, currency: string): string {
    const money = formatMoney(amount, currency)
    if (!cadenceLabel.value) {
      return money
    }

    return `${money} / ${cadenceLabel.value}`
  }

  return { cadenceLabel, formatMoneyWithCadence, settings }
}
