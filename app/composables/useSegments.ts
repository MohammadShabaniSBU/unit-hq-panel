import type { ApiMeta } from '~/types/facility'
import type { FilterGroup } from '~/types/filter'
import type { Segment, SegmentPayload, SegmentPreview } from '~/types/segment'

const emptyMeta = (perPage = 25): ApiMeta => ({
  current_page: 1,
  last_page: 1,
  per_page: perPage,
  total: 0
})

export function useSegments(scope: 'shared' | 'personal' | 'all' = 'all') {
  const { get, getPaginated, post, put } = useApi()

  const segments = ref<Array<Segment>>([])
  const meta = ref<ApiMeta>(emptyMeta())
  const pending = ref(false)
  const error = ref<unknown>(null)

  async function fetchSegments() {
    pending.value = true
    error.value = null

    try {
      const res = await get<Array<Segment>>('/api/segments', { scope })
      segments.value = res.data
    } catch (e) {
      error.value = e
      segments.value = []
    } finally {
      pending.value = false
    }
  }

  async function fetchPage(page: number, perPage: number) {
    pending.value = true
    error.value = null

    try {
      const res = await getPaginated<Segment>('/api/segments', {
        scope,
        page,
        per_page: perPage
      })
      segments.value = res.data
      meta.value = res.meta
    } catch (e) {
      error.value = e
      segments.value = []
      meta.value = emptyMeta(perPage)
    } finally {
      pending.value = false
    }
  }

  async function save(payload: SegmentPayload, id?: number) {
    const body = payload as unknown as Record<string, unknown>
    if (id) {
      const res = await put<Segment>(`/api/segments/${id}`, body)
      return res.data
    }

    const res = await post<Segment>('/api/segments', body)
    return res.data
  }

  async function archive(id: number) {
    await post(`/api/segments/${id}/archive`, {})
  }

  async function preview(body: { filter?: FilterGroup, segment_id?: number }) {
    const res = await post<SegmentPreview>('/api/segments/preview', body as unknown as Record<string, unknown>)
    return res.data
  }

  return {
    segments,
    meta,
    pending,
    error,
    fetchSegments,
    fetchPage,
    save,
    archive,
    preview
  }
}
