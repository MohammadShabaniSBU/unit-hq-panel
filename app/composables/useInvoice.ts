import type { ApiInvoice } from '~/types/invoice'

export function useInvoice(invoiceId: Ref<number | null> | ComputedRef<number | null>) {
  const { get, apiFetch } = useApi()
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const { data, pending, error, refresh } = useAsyncData(
    () => `invoice-${invoiceId.value ?? 'none'}`,
    async () => {
      if (!invoiceId.value) {
        return null
      }
      const response = await get<ApiInvoice>(`/api/invoices/${invoiceId.value}`)
      return response.data
    },
    { watch: [invoiceId] }
  )

  const invoice = computed(() => data.value)

  async function openPdf() {
    if (!invoiceId.value) {
      return
    }

    const blob = await apiFetch<Blob>(`/api/invoices/${invoiceId.value}/pdf`, {
      baseURL: config.public.apiBaseUrl,
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf',
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {})
      }
    })

    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    // Revoke after the tab has a chance to load.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return {
    invoice,
    pending,
    error,
    refresh,
    openPdf
  }
}
