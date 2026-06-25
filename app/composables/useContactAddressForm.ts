import type { ApiContactAddress, ContactAddressType } from '~/types/contactAddress'

export interface ContactAddressForm {
  type: ContactAddressType | undefined
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country_id: number | undefined
  label: string
  is_primary: boolean
}

function createDefaultForm(initial?: ApiContactAddress | null): ContactAddressForm {
  return {
    type: initial?.type,
    line1: initial?.line1 ?? '',
    line2: initial?.line2 ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    postal_code: initial?.postal_code ?? '',
    country_id: initial?.country_id ?? undefined,
    label: initial?.label ?? '',
    is_primary: initial?.is_primary ?? false
  }
}

function buildPayload(form: ContactAddressForm) {
  const payload: Record<string, unknown> = {
    type: form.type,
    is_primary: form.is_primary
  }

  const fields: Array<'line1' | 'line2' | 'city' | 'state' | 'postal_code' | 'label'> = [
    'line1',
    'line2',
    'city',
    'state',
    'postal_code',
    'label'
  ]

  for (const field of fields) {
    const value = form[field].trim()
    payload[field] = value.length ? value : null
  }

  payload.country_id = form.country_id ?? null

  return payload
}

export function useContactAddressForm() {
  const { post, patch, del } = useApi()
  const { t } = useI18n()
  const form = reactive<ContactAddressForm>(createDefaultForm())
  const submitting = ref(false)
  const deleting = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, Array<string>>>({})

  function reset(initial?: ApiContactAddress | null) {
    Object.assign(form, createDefaultForm(initial))
    error.value = null
    fieldErrors.value = {}
  }

  async function submit(contactId: number, addressId?: number) {
    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const payload = buildPayload(form)
      const url = addressId
        ? `/api/contacts/${contactId}/addresses/${addressId}`
        : `/api/contacts/${contactId}/addresses`

      const response = addressId
        ? await patch<ApiContactAddress>(url, payload)
        : await post<ApiContactAddress>(url, payload)

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
        addressId
          ? t('forms.address.editErrorMessage')
          : t('forms.address.createErrorMessage')
      )
      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(contactId: number, addressId: number) {
    deleting.value = true
    error.value = null

    try {
      await del(`/api/contacts/${contactId}/addresses/${addressId}`)
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
        }
      }

      error.value = fetchError.data?.message ?? t('forms.address.deleteErrorMessage')
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
