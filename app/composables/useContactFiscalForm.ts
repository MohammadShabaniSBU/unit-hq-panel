import type { ApiContact } from '~/types/contact'
import type { TaxIdType } from '~/types/legalEntity'

export interface ContactFiscalForm {
  billing_name: string
  tax_id: string
  tax_id_type: TaxIdType
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_postal_code: string
  billing_country_code: string
}

function createDefaultForm(): ContactFiscalForm {
  return {
    billing_name: '',
    tax_id: '',
    tax_id_type: 'nif',
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country_code: 'ES'
  }
}

export function formFromContact(contact: ApiContact): ContactFiscalForm {
  return {
    billing_name: contact.billing_name ?? '',
    tax_id: contact.tax_id ?? '',
    tax_id_type: contact.tax_id_type ?? 'nif',
    billing_address_line1: contact.billing_address_line1 ?? '',
    billing_address_line2: contact.billing_address_line2 ?? '',
    billing_city: contact.billing_city ?? '',
    billing_postal_code: contact.billing_postal_code ?? '',
    billing_country_code: contact.billing_country_code ?? 'ES'
  }
}

function buildPayload(form: ContactFiscalForm) {
  return {
    billing_name: form.billing_name.trim() || null,
    tax_id: form.tax_id.trim() || null,
    tax_id_type: form.tax_id.trim() ? form.tax_id_type : null,
    billing_address_line1: form.billing_address_line1.trim() || null,
    billing_address_line2: form.billing_address_line2.trim() || null,
    billing_city: form.billing_city.trim() || null,
    billing_postal_code: form.billing_postal_code.trim() || null,
    billing_country_code: form.billing_country_code.trim().toUpperCase() || null
  }
}

export function useContactFiscalForm() {
  const { patch } = useApi()
  const { t } = useI18n()
  const form = reactive<ContactFiscalForm>(createDefaultForm())
  const contactId = ref<number | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset() {
    Object.assign(form, createDefaultForm())
    contactId.value = null
    error.value = null
    fieldErrors.value = {}
  }

  function load(contact: ApiContact | null) {
    reset()

    if (!contact) {
      return
    }

    contactId.value = contact.id
    Object.assign(form, formFromContact(contact))
  }

  async function submit() {
    if (contactId.value == null) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const response = await patch<ApiContact>(
        `/api/contacts/${contactId.value}`,
        buildPayload(form)
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
        ?? t('pages.contacts.fiscal.saveError')
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
    reset,
    submit
  }
}
