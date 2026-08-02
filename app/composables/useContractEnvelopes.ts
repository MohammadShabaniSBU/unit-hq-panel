import type { ApiEsignEnvelope } from '~/types/esign'

export function useContractEnvelopes(contractId: Ref<number | null> | ComputedRef<number | null>) {
  const { get, post, downloadBlob } = useApi()
  const { t } = useI18n()

  const submitting = ref(false)
  const actionError = ref<string | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `contract-envelopes:${contractId.value ?? 'none'}`,
    async () => {
      if (!contractId.value) {
        return { message: '', data: [] as Array<ApiEsignEnvelope> }
      }
      return get<Array<ApiEsignEnvelope>>(`/api/contracts/${contractId.value}/envelopes`)
    },
    { watch: [contractId] }
  )

  const envelopes = computed(() => data.value?.data ?? [])

  const liveEnvelope = computed(() =>
    envelopes.value.find(e => e.status === 'sent' || e.status === 'viewed') ?? null
  )

  const signedEnvelope = computed(() =>
    envelopes.value.find(e => e.status === 'signed') ?? null
  )

  function extractErrorMessage(err: unknown, fallback: string): string {
    const fetchError = err as { data?: { message?: string, errors?: Record<string, Array<string>> } }
    const firstFieldError = fetchError.data?.errors ? Object.values(fetchError.data.errors)[0]?.[0] : undefined
    return firstFieldError ?? fetchError.data?.message ?? fallback
  }

  async function send(payload: {
    contract_document_id?: number
    expires_at?: string
  } = {}) {
    if (!contractId.value) return null
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<ApiEsignEnvelope>(
        `/api/contracts/${contractId.value}/envelopes`,
        payload
      )
      await refresh()
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contracts.signature.sendError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function resend(
    envelopeId: number,
    payload: { contract_document_id?: number, expires_at?: string } = {}
  ) {
    if (!contractId.value) return null
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<ApiEsignEnvelope>(
        `/api/contracts/${contractId.value}/envelopes/${envelopeId}/resend`,
        payload
      )
      await refresh()
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contracts.signature.resendError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function cancel(envelopeId: number) {
    if (!contractId.value) return null
    submitting.value = true
    actionError.value = null
    try {
      const response = await post<ApiEsignEnvelope>(
        `/api/contracts/${contractId.value}/envelopes/${envelopeId}/cancel`,
        {}
      )
      await refresh()
      return response.data
    } catch (err: unknown) {
      actionError.value = extractErrorMessage(err, t('contracts.signature.cancelError'))
      return null
    } finally {
      submitting.value = false
    }
  }

  async function downloadSignedPdf(envelopeId: number) {
    if (!contractId.value) return
    const blob = await downloadBlob(
      `/api/contracts/${contractId.value}/envelopes/${envelopeId}/signed-pdf`
    )
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function downloadCertificate(envelopeId: number) {
    if (!contractId.value) return
    const blob = await downloadBlob(
      `/api/contracts/${contractId.value}/envelopes/${envelopeId}/certificate`
    )
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return {
    envelopes,
    liveEnvelope,
    signedEnvelope,
    pending,
    error,
    submitting,
    actionError,
    refresh,
    send,
    resend,
    cancel,
    downloadSignedPdf,
    downloadCertificate
  }
}
