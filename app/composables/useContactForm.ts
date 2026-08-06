import type { ApiContact } from '~/types/contact'

export interface ContactForm {
  first_name: string
  last_name: string
  email: string
  company: string
}

function createDefaultForm(): ContactForm {
  return {
    first_name: '',
    last_name: '',
    email: '',
    company: ''
  }
}

function buildPayload(form: ContactForm) {
  const payload: Record<string, unknown> = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim()
  }

  if (form.email.trim()) {
    payload.email = form.email.trim()
  }

  if (form.company.trim()) {
    payload.company = form.company.trim()
  }

  return payload
}

export function useContactForm() {
  const { post } = useApi()
  const { t } = useI18n()
  const form = reactive<ContactForm>(createDefaultForm())
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    error.value = null
    fieldErrors.value = {}
  }

  async function submit() {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await post<ApiContact>('/api/contacts', buildPayload(form))
      return response.data
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string>>
        }
      }

      fieldErrors.value = fetchError.data?.errors ?? {}
      error.value = fetchError.data?.message ?? t('forms.contact.createErrorMessage')
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
    reset,
    submit
  }
}
