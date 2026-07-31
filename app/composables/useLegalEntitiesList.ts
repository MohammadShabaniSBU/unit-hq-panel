import type { ApiLegalEntity } from '~/types/legalEntity'

export type LegalEntityListStatus = 'active' | 'archived' | 'all'

export function useLegalEntitiesList() {
  const { getPaginated, post } = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const statusFilter = ref<LegalEntityListStatus>('active')
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'legal-entities',
    () => getPaginated<ApiLegalEntity>('/api/legal-entities', {
      page: page.value,
      per_page: perPage.value,
      status: statusFilter.value
    }),
    { watch: [page, perPage, statusFilter] }
  )

  const entities = computed(() => data.value?.data ?? [])
  const totalEntities = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => entities.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch(statusFilter, () => {
    resetPage()
  })

  async function archiveEntity(entity: ApiLegalEntity) {
    try {
      await post(`/api/legal-entities/${entity.id}/archive`, {})
      toast.add({
        title: t('pages.settings.legalEntities.archiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as {
        data?: {
          message?: string
          errors?: Record<string, Array<string | number>>
        }
      }
      const message = fetchError.data?.errors?.legal_entity?.[0]
        ?? fetchError.data?.message
        ?? t('pages.settings.legalEntities.archiveError')
      toast.add({
        title: String(message),
        color: 'error'
      })
      return false
    }
  }

  async function unarchiveEntity(entity: ApiLegalEntity) {
    try {
      await post(`/api/legal-entities/${entity.id}/unarchive`, {})
      toast.add({
        title: t('pages.settings.legalEntities.unarchiveSuccess'),
        color: 'success'
      })
      await refresh()
      return true
    } catch (err: unknown) {
      const fetchError = err as { data?: { message?: string } }
      toast.add({
        title: fetchError.data?.message ?? t('pages.settings.legalEntities.unarchiveError'),
        color: 'error'
      })
      return false
    }
  }

  return {
    statusFilter,
    entities,
    totalEntities,
    showingCount,
    perPage,
    page,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    archiveEntity,
    unarchiveEntity,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}
