import type { ApiPlaybookEnrolment, EnrolmentListStatus, PlaybookEnrolment } from '~/types/playbook'
import { normalizeEnrolment } from '~/types/playbook'

const PAGE_SIZE = 20

export function usePlaybookEnrolments(
  playbookId: MaybeRefOrGetter<string | number>,
  status: MaybeRefOrGetter<EnrolmentListStatus>
) {
  const { getPaginated } = useApi()
  const idRef = computed(() => String(toValue(playbookId)))
  const statusRef = computed(() => toValue(status))
  const page = ref(1)

  const { data, pending, error, refresh } = useAsyncData(
    () => `playbook-enrolments-${idRef.value}-${statusRef.value}-${page.value}`,
    () => getPaginated<ApiPlaybookEnrolment>(`/api/playbooks/${idRef.value}/enrolments`, {
      page: page.value,
      per_page: PAGE_SIZE,
      status: statusRef.value
    }),
    { watch: [idRef, statusRef, page] }
  )

  watch(statusRef, () => {
    page.value = 1
  })

  const enrolments = computed<Array<PlaybookEnrolment>>(() =>
    (data.value?.data ?? []).map(normalizeEnrolment)
  )
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  return {
    enrolments,
    totalCount,
    lastPage,
    page,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh
  }
}
