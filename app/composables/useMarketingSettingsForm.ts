import type { ApiMarketingSettings, MarketingPlaybookKind } from '~/types/settings'

export interface MarketingSettingsForm {
  marketing_frequency_cap_count: number
  marketing_frequency_cap_days: number
  marketing_exclude_delinquent: boolean
  marketing_exclude_active_playbook_kinds: Array<MarketingPlaybookKind>
  marketing_approval_threshold: number
}

function createDefaultForm(): MarketingSettingsForm {
  return {
    marketing_frequency_cap_count: 2,
    marketing_frequency_cap_days: 7,
    marketing_exclude_delinquent: true,
    marketing_exclude_active_playbook_kinds: ['debt_process'],
    marketing_approval_threshold: 500
  }
}

export function formFromMarketingSettings(settings: ApiMarketingSettings): MarketingSettingsForm {
  return {
    marketing_frequency_cap_count: settings.marketing_frequency_cap_count,
    marketing_frequency_cap_days: settings.marketing_frequency_cap_days,
    marketing_exclude_delinquent: settings.marketing_exclude_delinquent,
    marketing_exclude_active_playbook_kinds: [...settings.marketing_exclude_active_playbook_kinds],
    marketing_approval_threshold: settings.marketing_approval_threshold
  }
}

export function useMarketingSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const form = reactive<MarketingSettingsForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiMarketingSettings) {
    Object.assign(form, formFromMarketingSettings(settings))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiMarketingSettings>('/api/settings/marketing', { ...form })
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
