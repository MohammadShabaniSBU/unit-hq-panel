import type { ApiOption } from '~/types/facility'
import type { ApiPaymentProviderAccount } from '~/types/stripe'

export interface LegalEntityStripeOverviewRow {
  id: number
  name: string
  status: ApiPaymentProviderAccount['status']
}

export function useLegalEntitiesStripeOverview() {
  const { get } = useApi()

  const { data, pending, error, refresh } = useAsyncData(
    'settings-payments-entities-overview',
    async (): Promise<Array<LegalEntityStripeOverviewRow>> => {
      const entities = await get<Array<ApiOption>>('/api/legal-entities/options')

      const rows = await Promise.all(entities.data.map(async (entity): Promise<LegalEntityStripeOverviewRow> => {
        try {
          const setting = await get<ApiPaymentProviderAccount>(
            `/api/legal-entities/${entity.value}/stripe-settings`
          )
          return { id: entity.value, name: entity.label, status: setting.data.status }
        } catch {
          return { id: entity.value, name: entity.label, status: 'disconnected' }
        }
      }))

      return rows
    }
  )

  const rows = computed(() => data.value ?? [])

  return {
    rows,
    pending,
    error,
    refresh
  }
}
