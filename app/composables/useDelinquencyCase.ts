import type {
  ApiDelinquencyCase,
  NoticeChannel,
  NoticeType
} from '~/types/delinquency'

interface ListResponse {
  message: string
  data: Array<ApiDelinquencyCase>
  meta: { total: number }
}

export function useDelinquencyCase(contractId: MaybeRefOrGetter<number | null>) {
  const { apiFetch, post } = useApi()
  const idRef = toRef(() => toValue(contractId))

  const caseId = ref<number | null>(null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `delinquency-case-${idRef.value ?? 'none'}`,
    async () => {
      const cid = idRef.value
      if (cid == null || Number.isNaN(cid)) return null

      const open = await apiFetch<ListResponse>('/api/delinquencies', {
        query: { contract_id: cid, status: 'open', per_page: 1 }
      })
      const openCase = open.data[0]
      if (openCase) {
        caseId.value = openCase.id
        const show = await apiFetch<{ message: string, data: ApiDelinquencyCase }>(
          `/api/delinquencies/${openCase.id}`
        )
        return show.data
      }

      const cured = await apiFetch<ListResponse>('/api/delinquencies', {
        query: { contract_id: cid, status: 'cured', per_page: 1 }
      })
      const curedCase = cured.data[0]
      if (!curedCase) {
        caseId.value = null
        return null
      }
      caseId.value = curedCase.id
      const show = await apiFetch<{ message: string, data: ApiDelinquencyCase }>(
        `/api/delinquencies/${curedCase.id}`
      )
      return show.data
    },
    { watch: [idRef] }
  )

  const delinquencyCase = computed(() => data.value ?? null)

  async function mutate(path: string, body?: Record<string, unknown>) {
    const id = caseId.value ?? delinquencyCase.value?.id
    if (id == null) throw new Error('No delinquency case')
    const res = await post<ApiDelinquencyCase>(`/api/delinquencies/${id}${path}`, body ?? {})
    await refresh()
    return res.data
  }

  function assessFee(amount: string, reason: string) {
    return mutate('/assess-fee', { amount, reason })
  }

  function placeOverlock(unitId?: number | null) {
    return mutate('/overlock', unitId != null ? { unit_id: unitId } : {})
  }

  function releaseOverlock(unitId?: number | null, reason?: string) {
    return mutate('/release-overlock', {
      ...(unitId != null ? { unit_id: unitId } : {}),
      ...(reason ? { reason } : {})
    })
  }

  function recordNotice(noticeType: NoticeType) {
    return mutate('/notices', { notice_type: noticeType })
  }

  function pause(reason: string) {
    return mutate('/pause', { reason })
  }

  function resume() {
    return mutate('/resume')
  }

  function writeOff(reason: string) {
    return mutate('/write-off', { reason })
  }

  async function markNoticeSent(
    noticeId: number,
    channel: NoticeChannel,
    sentAt?: string | null,
    sentTo?: string | null
  ) {
    await post(`/api/contract-notices/${noticeId}/mark-sent`, {
      channel,
      ...(sentAt ? { sent_at: sentAt } : {}),
      ...(sentTo ? { sent_to: sentTo } : {})
    })
    await refresh()
  }

  return {
    delinquencyCase,
    pending,
    error,
    refresh,
    assessFee,
    placeOverlock,
    releaseOverlock,
    recordNotice,
    pause,
    resume,
    writeOff,
    markNoticeSent
  }
}
