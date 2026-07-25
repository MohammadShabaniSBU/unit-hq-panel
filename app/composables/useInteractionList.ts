import type { ApiInteraction, CreateInteractionPayload } from '~/types/interaction'

export function useInteractionList(contactId: Ref<string | number> | string | number) {
  const { getPaginated, post } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const id = computed(() => String(unref(contactId)))

  const { data, pending, error, refresh } = useAsyncData(
    () => `interactions-${id.value}-${page.value}-${perPage.value}`,
    () => getPaginated<ApiInteraction>(`/api/contacts/${id.value}/interactions`, {
      page: page.value,
      per_page: perPage.value
    }),
    {
      watch: [id, page, perPage]
    }
  )

  const interactions = computed(() => data.value?.data ?? [])
  const meta = computed(() => data.value?.meta ?? null)

  async function createInteraction(payload: CreateInteractionPayload) {
    const response = await post<ApiInteraction>(
      `/api/contacts/${id.value}/interactions`,
      payload as unknown as Record<string, unknown>
    )
    await refresh()
    return response.data
  }

  watch(id, () => {
    resetPage()
  })

  return {
    interactions,
    meta,
    pending,
    error,
    refresh,
    createInteraction,
    page,
    perPage,
    goToPrevPage,
    goToNextPage,
    goToPage
  }
}
