import type { ApiPaymentMethod, ApiPaymentMethodSetup } from '~/types/stripe'

export function useContactPaymentMethods(contactId: Ref<number | string>) {
  const { get, post, patch, del } = useApi()
  const { t } = useI18n()

  const { data, pending, error, refresh } = useAsyncData(
    () => `contact-payment-methods-${contactId.value}`,
    () => get<Array<ApiPaymentMethod>>(`/api/contacts/${contactId.value}/payment-methods`),
    { watch: [contactId] }
  )

  const methods = computed(() => data.value?.data ?? [])

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function setup(contractId: number) {
    submitting.value = true
    actionError.value = null

    try {
      const response = await post<ApiPaymentMethodSetup>(
        `/api/contacts/${contactId.value}/payment-methods/setup`,
        { contract_id: contractId }
      )
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contacts.paymentMethods.setupError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function setDefault(methodId: number) {
    submitting.value = true
    actionError.value = null

    try {
      await patch<ApiPaymentMethod>(`/api/payment-methods/${methodId}`, {
        is_default: true
      })
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contacts.paymentMethods.defaultError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  async function remove(methodId: number) {
    submitting.value = true
    actionError.value = null

    try {
      await del(`/api/payment-methods/${methodId}`)
      await refresh()
      return true
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contacts.paymentMethods.removeError'))
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    methods,
    pending,
    error,
    refresh,
    submitting,
    actionError,
    setup,
    setDefault,
    remove
  }
}
