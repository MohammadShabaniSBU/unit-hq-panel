import type { ApiSite, ApiUnitClass, ApiUnitClassSitePrice } from '~/types/facility'
import type { ApiBillingSettings } from '~/types/settings'

function createDefaultForm(): Record<number, string> {
  return {}
}

function amountValue(value: unknown): string {
  if (value == null || value === '') {
    return ''
  }

  return String(value).trim()
}

export function useUnitClassPrices() {
  const { get, getPaginated, post } = useApi()
  const { t } = useI18n()
  const sites = ref<Array<ApiUnitClassSitePrice>>([])
  const siteCurrencies = ref<Record<number, string | null>>({})
  const form = reactive<Record<number, string | number>>(createDefaultForm())
  const originalAmounts = ref<Record<number, string>>({})
  const billingSettings = ref<ApiBillingSettings | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  const billingSummary = computed(() => {
    const settings = billingSettings.value

    if (!settings?.default_currency) {
      return ''
    }

    return t('forms.unitClassPrices.subtitle', {
      currency: settings.default_currency,
      period: formatBillingCadence(settings.default_billing_interval, settings.default_billing_interval_count, t)
    })
  })

  function reset() {
    sites.value = []
    siteCurrencies.value = {}

    for (const key of Object.keys(form)) {
      Reflect.deleteProperty(form, Number(key))
    }

    originalAmounts.value = {}
    billingSettings.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function populateForm(items: Array<ApiUnitClassSitePrice>) {
    const nextForm = createDefaultForm()
    const nextOriginal: Record<number, string> = {}

    for (const item of items) {
      const amount = item.amount ?? ''
      nextForm[item.site_id] = amount
      nextOriginal[item.site_id] = amount
    }

    Object.assign(form, nextForm)
    originalAmounts.value = nextOriginal
  }

  async function loadSiteCurrencies(siteIds: Array<number>) {
    try {
      const response = await getPaginated<ApiSite>('/api/sites', {
        page: 1,
        per_page: 200,
        status: 'all'
      })

      const next: Record<number, string | null> = {}
      for (const site of response.data) {
        if (siteIds.includes(site.id)) {
          next[site.id] = site.currency
        }
      }
      siteCurrencies.value = next
    } catch {
      siteCurrencies.value = {}
    }
  }

  async function load(unitClass: ApiUnitClass | null) {
    reset()

    if (!unitClass) {
      return
    }

    loading.value = true

    try {
      const [pricesResponse, billingResponse] = await Promise.all([
        get<Array<ApiUnitClassSitePrice>>(`/api/unit-classes/${unitClass.id}/prices`),
        get<ApiBillingSettings>('/api/settings/billing')
      ])

      sites.value = pricesResponse.data
      billingSettings.value = billingResponse.data
      populateForm(pricesResponse.data)
      await loadSiteCurrencies(pricesResponse.data.map(item => item.site_id))
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.unitClassPrices.loadErrorMessage')
    } finally {
      loading.value = false
    }
  }

  function changedSiteIds() {
    return sites.value
      .map(item => item.site_id)
      .filter((siteId) => {
        const current = amountValue(form[siteId])
        const original = amountValue(originalAmounts.value[siteId])

        return current !== '' && current !== original
      })
  }

  function resolveCurrency(siteId: number) {
    return siteCurrencies.value[siteId]
      ?? billingSettings.value?.default_currency
      ?? undefined
  }

  async function save(unitClassId: number) {
    const siteIds = changedSiteIds()

    if (siteIds.length === 0) {
      return true
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      for (const siteId of siteIds) {
        const currency = resolveCurrency(siteId)

        await post<ApiUnitClassSitePrice>(`/api/unit-classes/${unitClassId}/prices`, {
          site_id: siteId,
          amount: amountValue(form[siteId]),
          ...(currency ? { currency } : {})
        })
      }

      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.unitClassPrices.saveErrorMessage')
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    sites,
    form,
    billingSettings,
    billingSummary,
    loading,
    submitting,
    error,
    fieldErrors,
    load,
    reset,
    save
  }
}
