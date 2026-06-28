import type { ApiLeasingSettings } from '~/types/settings'

export interface LeasingSettingsForm {
  default_offer_expiration_value: number
  default_offer_expiration_unit: string
  default_reservation_expiration_value: number
  default_reservation_expiration_unit: string
}

function createDefaultForm(): LeasingSettingsForm {
  return {
    default_offer_expiration_value: 7,
    default_offer_expiration_unit: 'days',
    default_reservation_expiration_value: 3,
    default_reservation_expiration_unit: 'days'
  }
}

export function formFromLeasingSettings(settings: ApiLeasingSettings): LeasingSettingsForm {
  return {
    default_offer_expiration_value: settings.default_offer_expiration_value,
    default_offer_expiration_unit: settings.default_offer_expiration_unit,
    default_reservation_expiration_value: settings.default_reservation_expiration_value,
    default_reservation_expiration_unit: settings.default_reservation_expiration_unit
  }
}

function buildPayload(form: LeasingSettingsForm) {
  return {
    default_offer_expiration_value: form.default_offer_expiration_value,
    default_offer_expiration_unit: form.default_offer_expiration_unit,
    default_reservation_expiration_value: form.default_reservation_expiration_value,
    default_reservation_expiration_unit: form.default_reservation_expiration_unit
  }
}

export function useLeasingSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const form = reactive<LeasingSettingsForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiLeasingSettings) {
    Object.assign(form, formFromLeasingSettings(settings))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiLeasingSettings>('/api/settings/leasing', buildPayload(form))
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
