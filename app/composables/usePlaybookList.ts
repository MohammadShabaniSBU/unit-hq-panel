import type { ApiPlaybook, Playbook, PlaybookKind } from '~/types/playbook'
import { normalizePlaybook } from '~/types/playbook'

const PAGE_SIZE = 20

export function usePlaybookList(kind: MaybeRefOrGetter<PlaybookKind>) {
  const { getPaginated, del, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const page = ref(1)
  const searchQuery = ref('')
  const kindRef = computed(() => toValue(kind))

  const { data, pending, error, refresh } = useAsyncData(
    () => `playbooks-${kindRef.value}-${page.value}-${searchQuery.value}`,
    () => getPaginated<ApiPlaybook>('/api/playbooks', {
      page: page.value,
      per_page: PAGE_SIZE,
      kind: kindRef.value,
      ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {})
    }),
    { watch: [kindRef, page, searchQuery] }
  )

  watch(searchQuery, () => {
    page.value = 1
  })

  const playbooks = computed(() => (data.value?.data ?? []).map(normalizePlaybook))
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  async function createPlaybook(name: string): Promise<Playbook | null> {
    try {
      const response = await post<ApiPlaybook>('/api/playbooks', {
        kind: kindRef.value,
        name,
        enrolment_filters: {},
        steps: []
      })
      toast.add({ title: t('playbooks.toasts.created'), color: 'success' })
      await refresh()
      return normalizePlaybook(response.data)
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('playbooks.toasts.createError'),
        color: 'error'
      })
      return null
    }
  }

  async function archivePlaybook(id: number): Promise<boolean> {
    try {
      await del(`/api/playbooks/${id}`)
      toast.add({ title: t('playbooks.toasts.archived'), color: 'success' })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('playbooks.toasts.archiveError'),
        color: 'error'
      })
      return false
    }
  }

  return {
    playbooks,
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
    createPlaybook,
    archivePlaybook
  }
}
