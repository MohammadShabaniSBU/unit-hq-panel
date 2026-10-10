import type { ApiResponse } from '~/types/facility'
import type {
  AudiencePreview,
  Campaign,
  CampaignChannelName,
  CampaignContentPreview,
  CampaignRecipientRow,
  CampaignReport,
  CampaignTypeName
} from '~/types/campaign'

export function useCampaignApi() {
  const { get, getPaginated, post, put, del, apiFetch } = useApi()

  function load(id: number) {
    return get<Campaign>(`/api/campaigns/${id}`).then(response => response.data)
  }

  function create(body: Record<string, unknown>) {
    return post<Campaign>('/api/campaigns', body).then(response => response.data)
  }

  function update(id: number, body: Record<string, unknown>) {
    return put<Campaign>(`/api/campaigns/${id}`, body).then(response => response.data)
  }

  function saveSend(id: number, channel: CampaignChannelName, body: Record<string, unknown>) {
    return put<Campaign>(`/api/campaigns/${id}/sends/${channel}`, body).then(response => response.data)
  }

  function removeSend(id: number, channel: CampaignChannelName) {
    return del(`/api/campaigns/${id}/sends/${channel}`).then(() => undefined)
  }

  function audiencePreview(id: number) {
    return post<AudiencePreview>(`/api/campaigns/${id}/audience-preview`, {}).then(response => response.data)
  }

  function contentPreview(id: number, channel: CampaignChannelName, contactId: number | null) {
    const query: Record<string, string | number> = {}
    if (contactId !== null) {
      query.contact_id = contactId
    }

    return get<CampaignContentPreview>(`/api/campaigns/${id}/sends/${channel}/preview`, query)
      .then(response => response.data)
  }

  function testSend(id: number, body: Record<string, unknown>) {
    return post<{ sent: number }>(`/api/campaigns/${id}/test-send`, body)
  }

  function submit(id: number) {
    return apiFetch<ApiResponse<Campaign> & { warnings?: Array<string> | null }>(`/api/campaigns/${id}/submit`, {
      method: 'POST',
      body: {}
    })
  }

  function transition(id: number, action: 'pause' | 'resume' | 'cancel' | 'approve') {
    return post<Campaign>(`/api/campaigns/${id}/${action}`, {}).then(response => response.data)
  }

  function reject(id: number, reason: string) {
    return post<Campaign>(`/api/campaigns/${id}/reject`, { reason }).then(response => response.data)
  }

  function duplicate(id: number) {
    return post<Campaign>(`/api/campaigns/${id}/duplicate`, {}).then(response => response.data)
  }

  function report(id: number) {
    return get<CampaignReport>(`/api/campaigns/${id}/report`).then(response => response.data)
  }

  function recipients(id: number, query: Record<string, string | number>) {
    return getPaginated<CampaignRecipientRow>(`/api/campaigns/${id}/recipients`, query)
  }

  function list(query: Record<string, string | number>) {
    return getPaginated<Campaign>(`/api/campaigns`, query)
  }

  return {
    load,
    create,
    update,
    saveSend,
    removeSend,
    audiencePreview,
    contentPreview,
    testSend,
    submit,
    transition,
    reject,
    duplicate,
    report,
    recipients,
    list
  }
}

export function useCampaignList(type: CampaignTypeName) {
  const api = useCampaignApi()
  const {
    page,
    perPage,
    resetPage,
    goToPrevPage,
    goToNextPage: nextPage,
    goToPage: setPage
  } = useListPagination()
  const status = ref('all')
  const awaitingMe = ref(false)
  const rows = ref<Array<Campaign>>([])
  const pending = ref(true)
  const error = ref(false)
  const lastPage = ref(1)
  const total = ref(0)

  async function refresh() {
    pending.value = true
    error.value = false

    const query: Record<string, string | number> = {
      type,
      page: page.value,
      per_page: perPage.value
    }
    if (awaitingMe.value) {
      query.awaiting_me = 1
    } else if (status.value && status.value !== 'all') {
      query.status = status.value
    }

    try {
      const response = await api.list(query)
      rows.value = response.data
      lastPage.value = response.meta.last_page
      total.value = response.meta.total
    } catch {
      error.value = true
      rows.value = []
    } finally {
      pending.value = false
    }
  }

  watch([page, perPage], () => {
    void refresh()
  })

  watch([status, awaitingMe], () => {
    if (page.value === 1) {
      void refresh()
      return
    }
    resetPage()
  })

  onMounted(() => {
    void refresh()
  })

  const showingCount = computed(() => rows.value.length)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  function goToNextPage() {
    nextPage(lastPage.value)
  }

  function goToPage(targetPage: number) {
    setPage(targetPage, lastPage.value)
  }

  return {
    page,
    perPage,
    status,
    awaitingMe,
    rows,
    pending,
    error,
    lastPage,
    total,
    showingCount,
    canGoPrev,
    canGoNext,
    refresh,
    goToPrevPage,
    goToNextPage,
    goToPage
  }
}
