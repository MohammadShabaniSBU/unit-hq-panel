import type {
  ApiContractDetail,
  VacatePayload,
  VacatePreview
} from '~/types/contract'

export function useContractVacate(contractId: MaybeRefOrGetter<string | number>) {
  const { post } = useApi()
  const pending = ref(false)
  const previewPending = ref(false)
  const error = ref<string | null>(null)

  async function giveNotice(scheduledMoveOutOn: string): Promise<ApiContractDetail> {
    pending.value = true
    error.value = null
    try {
      const res = await post<ApiContractDetail>(
        `/api/contracts/${toValue(contractId)}/notice`,
        { scheduled_move_out_on: scheduledMoveOutOn }
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      pending.value = false
    }
  }

  async function withdrawNotice(): Promise<ApiContractDetail> {
    pending.value = true
    error.value = null
    try {
      const res = await post<ApiContractDetail>(
        `/api/contracts/${toValue(contractId)}/notice-withdraw`,
        {}
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      pending.value = false
    }
  }

  async function previewVacate(payload: VacatePayload): Promise<VacatePreview> {
    previewPending.value = true
    error.value = null
    try {
      const res = await post<VacatePreview>(
        `/api/contracts/${toValue(contractId)}/vacate-preview`,
        payload as unknown as Record<string, unknown>
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      previewPending.value = false
    }
  }

  async function vacate(payload: VacatePayload): Promise<ApiContractDetail> {
    pending.value = true
    error.value = null
    try {
      const res = await post<ApiContractDetail>(
        `/api/contracts/${toValue(contractId)}/vacate`,
        payload as unknown as Record<string, unknown>
      )
      return res.data
    } catch (e: unknown) {
      error.value = extractError(e)
      throw e
    } finally {
      pending.value = false
    }
  }

  function extractError(e: unknown): string {
    if (e && typeof e === 'object' && 'data' in e) {
      const data = (e as { data?: { message?: string, errors?: Record<string, Array<string>> } }).data
      if (data?.errors) {
        const first = Object.values(data.errors)[0]
        if (first?.[0]) return first[0]
      }
      if (data?.message) return data.message
    }
    return 'Request failed'
  }

  return {
    pending,
    previewPending,
    error,
    giveNotice,
    withdrawNotice,
    previewVacate,
    vacate
  }
}
