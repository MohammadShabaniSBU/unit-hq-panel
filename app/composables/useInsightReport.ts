import type { InsightReport, InsightReportWritePayload, ValidationDetail, ValidationStatus } from '~/types/insights'

export function useInsightReport(id: MaybeRefOrGetter<number | null>) {
  const { get, post } = useApi()
  const {
    reports,
    update,
    archive,
    submitting,
    actionError,
    lastSaveError,
    refresh
  } = useInsightReports()

  const report = computed(() => {
    const reportId = toValue(id)
    if (reportId == null) {
      return null
    }
    return reports.value.find(row => row.id === reportId) ?? null
  })

  const detailPending = ref(false)
  const detail = ref<InsightReport | null>(null)

  async function fetchDetail(): Promise<InsightReport | null> {
    const reportId = toValue(id)
    if (reportId == null) {
      detail.value = null
      return null
    }

    detailPending.value = true
    try {
      const res = await get<InsightReport>(`/api/settings/insight-reports/${reportId}`)
      detail.value = res.data
      return res.data
    } catch {
      detail.value = null
      return null
    } finally {
      detailPending.value = false
    }
  }

  async function save(payload: InsightReportWritePayload) {
    const reportId = toValue(id)
    if (reportId == null) {
      return null
    }
    return update(reportId, payload)
  }

  async function archiveReport() {
    const reportId = toValue(id)
    if (reportId == null) {
      return false
    }
    return archive(reportId)
  }

  async function validate(): Promise<{
    status: ValidationStatus
    detail: ValidationDetail | null
    validated_at: string
  } | null> {
    const reportId = toValue(id)
    if (reportId == null) {
      return null
    }

    try {
      const res = await post<{
        status: ValidationStatus
        detail: ValidationDetail | null
        validated_at: string
      }>(`/api/settings/insight-reports/${reportId}/validate`, {})
      await refresh()
      const registry = useInsightRegistryStore()
      if (registry.loaded) {
        await registry.refresh()
      }
      return res.data
    } catch {
      return null
    }
  }

  return {
    report,
    detail,
    detailPending,
    submitting,
    actionError,
    lastSaveError,
    refresh,
    fetchDetail,
    save,
    archiveReport,
    validate
  }
}
