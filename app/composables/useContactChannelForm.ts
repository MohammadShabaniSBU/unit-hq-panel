import type { ApiContactChannel, ContactChannelType } from '~/types/contactChannel'

export interface ContactChannelForm {
  type: ContactChannelType | undefined
  value: string
  label: string
  is_primary: boolean
  opted_in: boolean
}

function createDefaultForm(initial?: ApiContactChannel | null): ContactChannelForm {
  return {
    type: initial?.type,
    value: initial?.value ?? '',
    label: initial?.label ?? '',
    is_primary: initial?.is_primary ?? false,
    opted_in: initial?.opted_in ?? true
  }
}

function buildPayload(form: ContactChannelForm) {
  const payload: Record<string, unknown> = {
    type: form.type,
    value: form.value.trim(),
    is_primary: form.is_primary,
    opted_in: form.opted_in
  }

  if (form.label.trim()) {
    payload.label = form.label.trim()
  } else {
    payload.label = null
  }

  return payload
}

export function useContactChannelForm() {
  const { post, patch, del } = useApi()
  const { t } = useI18n()
  const form = reactive<ContactChannelForm>(createDefaultForm())
  const submitting = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(initial?: ApiContactChannel | null) {
    Object.assign(form, createDefaultForm(initial))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(contactId: number, channelId?: number) {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const url = channelId
        ? `/api/contacts/${contactId}/channels/${channelId}`
        : `/api/contacts/${contactId}/channels`

      const response = channelId
        ? await patch<ApiContactChannel>(url, payload)
        : await post<ApiContactChannel>(url, payload)

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? (
        channelId
          ? t('forms.channel.editErrorMessage')
          : t('forms.channel.createErrorMessage')
      )
      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(contactId: number, channelId: number) {
    deleting.value = true
    error.value = null

    try {
      await del(`/api/contacts/${contactId}/channels/${channelId}`)
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.channel.deleteErrorMessage')
      return false
    } finally {
      deleting.value = false
    }
  }

  return {
    form,
    submitting,
    deleting,
    error,
    fieldErrors,
    reset,
    submit,
    remove
  }
}
