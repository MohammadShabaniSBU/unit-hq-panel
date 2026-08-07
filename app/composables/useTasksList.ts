import type { ApiTask, TaskStatus, TaskStatusFilter } from '~/types/task'

function buildListQuery(
  page: number,
  perPage: number,
  statusFilter: TaskStatusFilter,
  search: string,
  siteQuery: Record<string, number>
) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage,
    ...siteQuery
  }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  const trimmed = search.trim()
  if (trimmed) {
    query.search = trimmed
  }

  return query
}

export function useTasksList() {
  const { getPaginated } = useApi()
  const { portalSiteId, portalSiteQuery } = usePortalSiteQuery()
  const searchQuery = ref('')
  const statusFilter = ref<TaskStatusFilter>('all')
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'tasks',
    () => getPaginated<ApiTask>(
      '/api/tasks',
      buildListQuery(
        page.value,
        perPage.value,
        statusFilter.value,
        searchQuery.value,
        portalSiteQuery.value
      )
    ),
    { watch: [page, perPage, statusFilter, searchQuery, portalSiteId] }
  )

  const paginatedTasks = computed(() => data.value?.data ?? [])
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedTasks.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter, portalSiteId], () => {
    resetPage()
  })

  return {
    searchQuery,
    statusFilter,
    paginatedTasks,
    totalCount,
    showingCount,
    page,
    perPage,
    perPageOptions,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value)
  }
}

export { taskStatusColor, taskPriorityColor, taskablePath } from '~/types/task'
export type { TaskStatus }
