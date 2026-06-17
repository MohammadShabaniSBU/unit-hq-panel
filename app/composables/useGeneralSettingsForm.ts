import type { ApiGeneralSettings } from '~/types/settings'

export interface GeneralSettingsForm {
  company_name: string
  company_contact_email: string
  phone: string
}

function createDefaultForm(): GeneralSettingsForm {
  return {
    company_name: '',
    company_contact_email: '',
    phone: ''
  }
}

export function formFromGeneralSettings(settings: ApiGeneralSettings): GeneralSettingsForm {
  return {
    company_name: settings.company_name,
    company_contact_email: settings.company_contact_email,
    phone: settings.phone
  }
}

function buildPayload(form: GeneralSettingsForm) {
  return {
    company_name: form.company_name.trim(),
    company_contact_email: form.company_contact_email.trim(),
    phone: form.phone.trim()
  }
}

export function useGeneralSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
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
