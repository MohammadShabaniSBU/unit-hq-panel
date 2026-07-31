import type { ApiInvoice, RectificationReason } from '~/types/invoice'

export function useInvoice(invoiceId: Ref<number | null> | ComputedRef<number | null>) {
  const { get, post, apiFetch } = useApi()
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

  async function rectify(reason: RectificationReason = 'operator_correction', chargeIds?: number[]) {
    if (!invoiceId.value) {
      throw new Error('No invoice selected')
    }

    const body: Record<string, unknown> = { reason }
    if (chargeIds?.length) {
      body.charge_ids = chargeIds
    }

    const response = await post<ApiInvoice>(`/api/invoices/${invoiceId.value}/rectify`, body)
    await refresh()
    return response.data
  }

  return {
    invoice,
    pending,
    error,
    refresh,
    openPdf,
    rectify
  }
}
