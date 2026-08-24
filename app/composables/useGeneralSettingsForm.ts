import type { ApiGeneralSettings } from '~/types/settings'
import type { DateFormatPattern } from '~/utils/orgDateFormat'
import { DEFAULT_DATE_FORMAT, isDateFormatPattern } from '~/utils/orgDateFormat'

export interface GeneralSettingsForm {
  company_name: string
  company_contact_email: string
  phone: string
  date_format: DateFormatPattern
}

function createDefaultForm(): GeneralSettingsForm {
  return {
    company_name: '',
    company_contact_email: '',
    phone: '',
    date_format: DEFAULT_DATE_FORMAT
  }
}

export function formFromGeneralSettings(settings: ApiGeneralSettings): GeneralSettingsForm {
  return {
    company_name: settings.company_name,
    company_contact_email: settings.company_contact_email,
    phone: settings.phone,
    date_format: isDateFormatPattern(settings.date_format)
      ? settings.date_format
      : DEFAULT_DATE_FORMAT
  }
}

function buildPayload(form: GeneralSettingsForm) {
  return {
    company_name: form.company_name.trim(),
    company_contact_email: form.company_contact_email.trim(),
    phone: form.phone.trim(),
    date_format: form.date_format
  }
}

export function useGeneralSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const branding = useBrandingStore()
  const form = reactive<GeneralSettingsForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiGeneralSettings) {
    Object.assign(form, formFromGeneralSettings(settings))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiGeneralSettings>('/api/settings/general', buildPayload(form))
      branding.apply(response.data)
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
