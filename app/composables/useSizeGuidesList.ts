import type { ApiSizeGuide, SizeGuideListStatus, SizeGuideMetric } from '~/types/facility'

function matchesSearch(guide: ApiSizeGuide, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    guide.metric,
    guide.notes ?? '',
    guide.site_name ?? '',
    guide.unit_class_label ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

export function formatSizeGuideMetric(
  metric: SizeGuideMetric,
  t: (key: string) => string
) {
  return t(`facility.size_guides.metrics.${metric}`)
}

export function formatSizeGuideBand(guide: ApiSizeGuide) {
  if (guide.unit_class_label) {
    return guide.unit_class_label
  }

  const min = guide.min_size
  const max = guide.max_size
  if (min && max && min !== max) {
    return `${min}–${max} m²`
  }
  if (min && max) {
    return `${min} m²`
  }
  if (min) {
    return `≥ ${min} m²`
  }
  if (max) {
    return `≤ ${max} m²`
  }

  return '—'
}

export function useSizeGuidesList() {
  const { get, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()

  const searchQuery = ref('')
  const statusFilter = ref<SizeGuideListStatus>('active')
  const guides = ref<Array<ApiSizeGuide>>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  const filteredGuides = computed(() =>
    guides.value.filter(guide => matchesSearch(guide, searchQuery.value))
  )

  async function refresh() {
    pending.value = true
    error.value = null

    try {
      const response = await get<Array<ApiSizeGuide>>('/api/size-guides', {
        status: statusFilter.value
      })
      guides.value = response.data
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      error.value = fetchError.data?.message ?? t('facility.size_guides.loadError')
    } finally {
      pending.value = false
    }
  }

  async function archiveGuide(guide: ApiSizeGuide) {
    try {
      await post<ApiSizeGuide>(`/api/size-guides/${guide.id}/archive`, {})
      toast.add({
        title: t('facility.size_guides.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('facility.size_guides.archiveError'),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveGuide(guide: ApiSizeGuide) {
    try {
      await post<ApiSizeGuide>(`/api/size-guides/${guide.id}/unarchive`, {})
      toast.add({
        title: t('facility.size_guides.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('facility.size_guides.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  watch(statusFilter, () => {
    refresh()
  })

  return {
    searchQuery,
    statusFilter,
    guides: filteredGuides,
    pending,
    error,
    refresh,
    archiveGuide,
    unarchiveGuide
  }
}
