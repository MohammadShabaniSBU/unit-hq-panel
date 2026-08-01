import type { ApiBillingSettings } from '~/types/settings'
import type { BillingAnchorModel, BillingInterval, ProrationMethod } from '~/types/contract'

export interface BillingSettingsForm {
  default_currency: string
  default_billing_interval: BillingInterval
  default_billing_interval_count: number
  billing_anchor_model: BillingAnchorModel
  billing_anchor_day: number
  proration_method: ProrationMethod
  default_deposit_amount: string
  billing_horizon_days: number
}

function createDefaultForm(): BillingSettingsForm {
  return {
    default_currency: '',
    default_billing_interval: 'month',
    default_billing_interval_count: 1,
    billing_anchor_model: 'anniversary',
    billing_anchor_day: 1,
    proration_method: 'daily',
    default_deposit_amount: '0.00',
    billing_horizon_days: 0
  }
}

export function formFromBillingSettings(settings: ApiBillingSettings): BillingSettingsForm {
  return {
    default_currency: settings.default_currency,
    default_billing_interval: settings.default_billing_interval,
    default_billing_interval_count: settings.default_billing_interval_count,
    billing_anchor_model: settings.billing_anchor_model,
    billing_anchor_day: settings.billing_anchor_day,
    proration_method: settings.proration_method,
    default_deposit_amount: settings.default_deposit_amount,
    billing_horizon_days: settings.billing_horizon_days ?? 0
  }
}

function buildPayload(form: BillingSettingsForm) {
  return {
    default_currency: form.default_currency.trim().toUpperCase(),
    default_billing_interval: form.default_billing_interval,
    default_billing_interval_count: form.default_billing_interval_count,
    billing_anchor_model: form.billing_anchor_model,
    billing_anchor_day: form.billing_anchor_day,
    proration_method: form.proration_method,
    default_deposit_amount: form.default_deposit_amount,
    billing_horizon_days: form.billing_horizon_days
  }
}

export function useBillingSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const form = reactive<BillingSettingsForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiBillingSettings) {
    Object.assign(form, formFromBillingSettings(settings))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    if (form.billing_anchor_model === 'calendar' && form.default_billing_interval !== 'month') {
      fieldErrors.value = {
        billing_anchor_model: [t('forms.settings.calendarRequiresMonthly')]
      }
      error.value = t('forms.settings.calendarRequiresMonthly')
      submitting.value = false
      return null
    }

    if (form.billing_anchor_model === 'calendar_week' && form.default_billing_interval !== 'week') {
      fieldErrors.value = {
        billing_anchor_model: [t('forms.settings.calendarRequiresWeekly')]
      }
      error.value = t('forms.settings.calendarRequiresWeekly')
      submitting.value = false
      return null
    }

    if (form.billing_anchor_model === 'calendar_week' && (form.billing_anchor_day < 1 || form.billing_anchor_day > 7)) {
      fieldErrors.value = {
        billing_anchor_day: [t('forms.settings.calendarWeekdayRange')]
      }
      error.value = t('forms.settings.calendarWeekdayRange')
      submitting.value = false
      return null
    }

    try {
      const response = await patch<ApiBillingSettings>('/api/settings/billing', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.settings.saveErrorMessage')
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    submitting,
    error,
    fieldErrors,
    load,
    submit
  }
}
