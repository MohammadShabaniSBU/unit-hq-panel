import type { ApiDeployment } from '~/types/deployment'

export const useDeploymentStore = defineStore('deployment', () => {
  const country = ref('')
  const currency = ref('')
  const defaultLocale = ref('')
  const allowedTimezones = ref<Array<string>>([])
  const taxSubdivisions = ref<Array<string>>([])
  const paymentRails = ref<Array<string>>([])
  const fiscalRegime = ref('')
  const loaded = ref(false)
  let inflight: Promise<void> | null = null

  function apply(payload: ApiDeployment) {
    country.value = payload.country
    currency.value = payload.currency
    defaultLocale.value = payload.default_locale
    allowedTimezones.value = payload.allowed_timezones
    taxSubdivisions.value = payload.tax_subdivisions ?? []
    paymentRails.value = payload.payment_rails
    fiscalRegime.value = payload.fiscal_regime
  }

  async function load(force = false) {
    if (loaded.value && !force) {
      return
    }

    if (inflight && !force) {
      return inflight
    }

    const { get } = useApi()

    inflight = (async () => {
      try {
        const response = await get<ApiDeployment>('/api/deployment')
        apply(response.data)
        loaded.value = true
      } catch {
        loaded.value = true
      } finally {
        inflight = null
      }
    })()

    return inflight
  }

  function allowsRail(rail: string) {
    return paymentRails.value.includes(rail)
  }

  return {
    country,
    currency,
    defaultLocale,
    allowedTimezones,
    taxSubdivisions,
    paymentRails,
    fiscalRegime,
    loaded,
    apply,
    load,
    allowsRail
  }
})
