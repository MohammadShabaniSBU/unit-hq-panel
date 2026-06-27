import type { ApiAutomation } from '~/types/automation'
import { normalizeAutomation } from '~/types/automation'

const PAGE_SIZE = 20

export function useAutomationsList() {
  const { getPaginated, del } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const page = ref(1)
  const searchQuery = ref('')

  const { data, pending, error, refresh } = useAsyncData(
    'automations',
    () => getPaginated<ApiAutomation>('/api/automations', {
      page: page.value,
      per_page: PAGE_SIZE,
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {}),
    }),
    { watch: [page, searchQuery] },
  )

  watch(searchQuery, () => {
    page.value = 1
  })

  const automations = computed(() => (data.value?.data ?? []).map(normalizeAutomation))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function deleteAutomation(id: string) {
    try {
      await del(`/api/automations/${id}`)
      toast.add({ title: t('forms.automation.deleteSuccessMessage'), color: 'success' })
      await refresh()
    }
    catch {
      toast.add({ title: t('forms.automation.deleteErrorMessage'), color: 'error' })
    }
  }

  return {
    automations,
    totalCount,
    lastPage,
    page,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    searchQuery,
    pending,
    error,
    refresh,
    deleteAutomation,
  }
}
