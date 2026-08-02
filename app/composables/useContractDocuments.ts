import type { ApiContractDocument } from '~/types/esign'

export function useContractDocuments(contractId: Ref<number | null> | ComputedRef<number | null>) {
  const { get, post, downloadBlob } = useApi()
  const { t } = useI18n()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `contract-documents:${contractId.value ?? 'none'}`,
    async () => {
      if (!contractId.value) {
        return { message: '', data: [] as Array<ApiContractDocument> }
      }
      return get<Array<ApiContractDocument>>(`/api/contracts/${contractId.value}/documents`)
    },
    { watch: [contractId] }
  )

  const documents = computed(() => data.value?.data ?? [])

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function generate(payload: { locale?: string } = {}) {
    if (!contractId.value) return null
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<ApiContractDocument>(
        `/api/contracts/${contractId.value}/documents`,
        payload
      )
      await refresh()
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contracts.signature.generateError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function openPreview(locale?: string) {
    if (!contractId.value) return
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : ''
    const blob = await downloadBlob(`/api/contracts/${contractId.value}/documents/preview${query}`)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function openPdf(documentId: number) {
    if (!contractId.value) return
    const blob = await downloadBlob(
      `/api/contracts/${contractId.value}/documents/${documentId}/pdf`
    )
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return {
    documents,
    pending,
    error,
    submitting,
    actionError,
    refresh,
    generate,
    openPreview,
    openPdf
  }
}
