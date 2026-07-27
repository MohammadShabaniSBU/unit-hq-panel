import type { ApiAutomationRun, AutomationRunStatus } from '~/types/automation'
import { normalizeRun } from '~/types/automation'

const PAGE_SIZE = 20

export function useAutomationRunsList(automationId: MaybeRefOrGetter<string | number>) {
  const { getPaginated } = useApi()
  const id = computed(() => String(toValue(automationId)))
  const page = ref(1)
  const statusFilter = ref<AutomationRunStatus | 'all'>('all')
  const fromDate = ref('')
  const toDate = ref('')

  const { data, pending, error, refresh } = useAsyncData(
    () => `automation-runs-${id.value}-${page.value}-${statusFilter.value}-${fromDate.value}-${toDate.value}`,
    () => getPaginated<ApiAutomationRun>(`/api/automations/${id.value}/runs`, {
      page: page.value,
      per_page: PAGE_SIZE,
      ...(statusFilter.value !== 'all' ? { status: statusFilter.value } : {}),
      ...(fromDate.value ? { from: fromDate.value } : {}),
      ...(toDate.value ? { to: toDate.value } : {})
    }),
    { watch: [id, page, statusFilter, fromDate, toDate] }
  )

  watch([statusFilter, fromDate, toDate], () => {
    page.value = 1
  })

  const runs = computed(() => (data.value?.data ?? []).map(normalizeRun))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  return {
    runs,
    totalCount,
    lastPage,
    page,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    statusFilter,
    fromDate,
    toDate,
    pending,
    error,
    refresh
  }
}
