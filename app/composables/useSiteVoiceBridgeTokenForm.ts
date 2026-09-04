import type { ApiVoiceBridgeToken, VoiceBridgeTokenForm } from '~/types/voiceBridgeToken'

function createDefaultForm(): VoiceBridgeTokenForm {
  return {
    phone_number: '',
    main_line_number: '',
    voicemail_number: '',
    label: ''
  }
}

export const E164_PHONE = /^\+[1-9]\d{1,14}$/

export function useSiteVoiceBridgeTokenForm(siteId: Ref<number> | ComputedRef<number>) {
  const { post, patch } = useApi()
  const { t } = useI18n()
  const form = reactive<VoiceBridgeTokenForm>(createDefaultForm())
  const editingId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    editingId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(item: ApiVoiceBridgeToken) {
    form.phone_number = item.phone_number ?? ''
    form.main_line_number = item.main_line_number ?? ''
    form.voicemail_number = item.voicemail_number ?? ''
    form.label = item.label ?? ''
    editingId.value = item.id
    error.value = null
    fieldErrors.value = {}
  }

  function emptyToNull(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  function payload(): Record<string, unknown> {
    return {
      phone_number: form.phone_number.trim(),
      main_line_number: emptyToNull(form.main_line_number),
      voicemail_number: emptyToNull(form.voicemail_number),
      label: emptyToNull(form.label)
    }
  }

  async function submit(): Promise<ApiVoiceBridgeToken | null> {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const body = payload()
      const response = editingId.value == null
        ? await post<ApiVoiceBridgeToken>(
            `/api/sites/${siteId.value}/voice-bridge-tokens`,
            body
          )
        : await patch<ApiVoiceBridgeToken>(
            `/api/sites/${siteId.value}/voice-bridge-tokens/${editingId.value}`,
            body
          )

      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message
        ?? (editingId.value == null
          ? t('facility.voiceBridgeTokens.createError')
          : t('facility.voiceBridgeTokens.updateError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function regenerateSecret(item: ApiVoiceBridgeToken): Promise<string | null> {
    try {
      const response = await post<ApiVoiceBridgeToken>(
        `/api/sites/${siteId.value}/voice-bridge-tokens/${item.id}/regenerate-secret`,
        {}
      )
      return response.data.secret ?? null
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? t('facility.voiceBridgeTokens.regenerateError')
      return null
    }
  }

  return {
    form,
    editingId,
    submitting,
    error,
    fieldErrors,
    reset,
    load,
    submit,
    regenerateSecret
  }
}
