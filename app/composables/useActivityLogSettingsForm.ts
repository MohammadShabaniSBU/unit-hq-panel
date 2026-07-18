import type { ActivityLogChannel, ApiActivityLogSettings } from '~/types/activity'

export interface ActivityLogSettingsForm {
  channels: Array<ActivityLogChannel>
  retention_months: number
}

const OPTIONAL_CHANNELS: Array<ActivityLogChannel> = ['crm', 'facility', 'comms', 'billing']

function createDefaultForm(): ActivityLogSettingsForm {
  return {
    channels: [...OPTIONAL_CHANNELS],
    retention_months: 12
  }
}

export function formFromActivityLogSettings(settings: ApiActivityLogSettings): ActivityLogSettingsForm {
  return {
    channels: [...settings.channels] as Array<ActivityLogChannel>,
    retention_months: settings.retention_months
  }
}

export function useActivityLogSettingsForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const form = reactive<ActivityLogSettingsForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiActivityLogSettings) {
    Object.assign(form, formFromActivityLogSettings(settings))
    error.value = null
    fieldErrors.value = {}
  }

  function isChannelEnabled(channel: ActivityLogChannel) {
    return form.channels.includes(channel)
  }

  function setChannelEnabled(channel: ActivityLogChannel, enabled: boolean) {
    if (enabled) {
      if (!form.channels.includes(channel)) {
        form.channels.push(channel)
      }
      return
    }

    form.channels = form.channels.filter(c => c !== channel)
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiActivityLogSettings>('/api/settings/activity-log', {
        channels: form.channels,
        retention_months: form.retention_months
      })
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
    optionalChannels: OPTIONAL_CHANNELS,
    submitting,
    error,
    fieldErrors,
    load,
    isChannelEnabled,
    setChannelEnabled,
    submit
  }
}
