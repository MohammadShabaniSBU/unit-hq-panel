import type { ApiBillingSettings } from '~/types/settings'

export interface BillingSettingsForm {
  default_currency: string
  default_billing_period: string
}

function createDefaultForm(): BillingSettingsForm {
  return {
    default_currency: '',
    default_billing_period: ''
  }
}

export function formFromBillingSettings(settings: ApiBillingSettings): BillingSettingsForm {
  return {
    default_currency: settings.default_currency,
    default_billing_period: settings.default_billing_period
  }
}

function buildPayload(form: BillingSettingsForm) {
  return {
    default_currency: form.default_currency.trim().toUpperCase(),
    default_billing_period: form.default_billing_period
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
