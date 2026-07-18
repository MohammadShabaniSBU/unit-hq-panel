import type { ActivitySubjectType, ApiActivity } from '~/types/activity'

export function useActivityList(options: {
  subjectType: Ref<ActivitySubjectType> | ActivitySubjectType
  subjectId: Ref<number | null | undefined> | number | null | undefined
}) {
  const { getPaginated } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const subjectType = computed(() => unref(options.subjectType))
  const subjectId = computed(() => unref(options.subjectId))

  const enabled = computed(() => subjectId.value != null && subjectId.value > 0)

  const { data, pending, error, refresh } = useAsyncData(
    () => `activities-${subjectType.value}-${subjectId.value}-${page.value}-${perPage.value}`,
    () => {
      if (!enabled.value) {
        return Promise.resolve(null)
      }

      return getPaginated<ApiActivity>('/api/activities', {
        page: page.value,
        per_page: perPage.value,
        subject_type: subjectType.value,
        subject_id: subjectId.value
      })
    },
    {
      watch: [subjectType, subjectId, page, perPage],
      immediate: true
    }
  )

  const activities = computed(() => data.value?.data ?? [])
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([subjectType, subjectId], () => {
    resetPage()
  })

  return {
    activities,
    totalCount,
    pending,
    error,
    refresh,
    page,
    perPage,
    lastPage,
    canGoPrev,
    canGoNext,
    goToPrevPage,
    goToNextPage,
    goToPage
  }
}
