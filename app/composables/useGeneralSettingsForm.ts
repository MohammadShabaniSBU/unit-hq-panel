import type { ApiGeneralSettings, EmailFontStack } from '~/types/settings'
import type { DateFormatPattern } from '~/utils/orgDateFormat'
import { DEFAULT_DATE_FORMAT, isDateFormatPattern } from '~/utils/orgDateFormat'

const FONT_STACKS: Array<EmailFontStack> = ['system', 'arial', 'georgia', 'verdana', 'trebuchet']

export function isEmailFontStack(value: unknown): value is EmailFontStack {
  return typeof value === 'string' && FONT_STACKS.includes(value as EmailFontStack)
}

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

export interface EmailBrandForm {
  email_accent_color: string
  email_logo_asset_id: number | null
  email_logo_url: string | null
  email_text_color: string
  email_background_color: string
  email_font_stack: EmailFontStack
}

function createDefaultBrandForm(): EmailBrandForm {
  return {
    email_accent_color: '#1d4ed8',
    email_logo_asset_id: null,
    email_logo_url: null,
    email_text_color: '#111827',
    email_background_color: '#f3f4f6',
    email_font_stack: 'arial'
  }
}

export function formFromEmailBrand(settings: ApiGeneralSettings): EmailBrandForm {
  return {
    email_accent_color: normalizeHex(settings.email_accent_color, '#1d4ed8'),
    email_logo_asset_id: settings.email_logo_asset_id,
    email_logo_url: settings.email_logo_url,
    email_text_color: normalizeHex(settings.email_text_color, '#111827'),
    email_background_color: normalizeHex(settings.email_background_color, '#f3f4f6'),
    email_font_stack: isEmailFontStack(settings.email_font_stack)
      ? settings.email_font_stack
      : 'arial'
  }
}

function normalizeHex(value: string | null | undefined, fallback: string) {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return value.toLowerCase()
  }

  return fallback
}

function buildBrandPayload(form: EmailBrandForm) {
  return {
    email_accent_color: form.email_accent_color,
    email_logo_asset_id: form.email_logo_asset_id,
    email_text_color: form.email_text_color,
    email_background_color: form.email_background_color,
    email_font_stack: form.email_font_stack
  }
}

export function useEmailBrandForm() {
  const { patch, upload } = useApi()
  const { t } = useI18n()
  const form = reactive<EmailBrandForm>(createDefaultBrandForm())
  const submitting = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function load(settings: ApiGeneralSettings) {
    Object.assign(form, formFromEmailBrand(settings))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiGeneralSettings>('/api/settings/general', buildBrandPayload(form))
      load(response.data)
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

  async function uploadLogo(file: File) {
    uploading.value = true
    error.value = null

    try {
      const body = new FormData()
      body.append('file', file)
      const response = await upload<{
        id: number
        public_url: string
      }>('/api/template-assets', body)
      form.email_logo_asset_id = response.data.id
      form.email_logo_url = response.data.public_url
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? t('forms.settings.saveErrorMessage')
    } finally {
      uploading.value = false
    }
  }

  function clearLogo() {
    form.email_logo_asset_id = null
    form.email_logo_url = null
  }

  return {
    form,
    submitting,
    uploading,
    error,
    fieldErrors,
    load,
    submit,
    uploadLogo,
    clearLogo
  }
}
