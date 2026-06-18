export const DEFAULT_PER_PAGE = 25

export const PER_PAGE_OPTIONS = [25, 50, 100] as const

export type PerPageOption = (typeof PER_PAGE_OPTIONS)[number]

export function useListPagination() {
  const page = ref(1)
  const perPage = ref<PerPageOption>(DEFAULT_PER_PAGE)

  watch(perPage, () => {
    page.value = 1
  })

  function resetPage() {
    page.value = 1
  }

  function goToPrevPage() {
    if (page.value > 1) {
      page.value -= 1
    }
  }

  function goToNextPage(lastPage: number) {
    if (page.value < lastPage) {
      page.value += 1
    }
  }

  function goToPage(targetPage: number, lastPage: number) {
    if (targetPage >= 1 && targetPage <= lastPage) {
      page.value = targetPage
    }
  }

  return {
    page,
    perPage,
    perPageOptions: PER_PAGE_OPTIONS,
    resetPage,
    goToPrevPage,
    goToNextPage,
    goToPage
  }
}
