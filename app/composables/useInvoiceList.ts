import type { ApiInvoice, InvoiceKind } from '~/types/invoice'

export function useInvoiceList(filters?: {
  contactId?: Ref<number | null | undefined> | ComputedRef<number | null | undefined>
  contractId?: Ref<number | null | undefined> | ComputedRef<number | null | undefined>
}) {
  const { getPaginated } = useApi()
  const { page, perPage, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const legalEntityId = ref<number | null>(null)
  const kind = ref<InvoiceKind | null>(null)
  const dateFrom = ref<string>('')
  const dateTo = ref<string>('')

  const contactId = computed(() => filters?.contactId?.value ?? null)
  const contractId = computed(() => filters?.contractId?.value ?? null)

  const { data, pending, error, refresh } = useAsyncData(
    () => `invoices-${contactId.value ?? 'all'}-${contractId.value ?? 'all'}-${legalEntityId.value ?? 'all'}-${kind.value ?? 'all'}-${dateFrom.value}-${dateTo.value}-${page.value}-${perPage.value}`,
    () => {
      const query: Record<string, string | number> = {
        page: page.value,
        per_page: perPage.value
      }
      if (legalEntityId.value) {
        query.legal_entity_id = legalEntityId.value
      }
      if (kind.value) {
        query.kind = kind.value
      }
      if (dateFrom.value) {
        query.date_from = dateFrom.value
      }
      if (dateTo.value) {
        query.date_to = dateTo.value
      }
      if (contactId.value) {
        query.contact_id = contactId.value
      }
      if (contractId.value) {
        query.contract_id = contractId.value
      }

      return getPaginated<ApiInvoice>('/api/invoices', query)
    },
    { watch: [page, perPage, legalEntityId, kind, dateFrom, dateTo, contactId, contractId] }
  )

  const invoices = computed(() => data.value?.data ?? [])
  const total = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => invoices.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([legalEntityId, kind, dateFrom, dateTo, contactId, contractId], () => {
    resetPage()
  })

  return {
    invoices,
    total,
    showingCount,
    page,
    perPage,
    lastPage,
    canGoPrev,
    canGoNext,
    pending,
    error,
    refresh,
    legalEntityId,
    kind,
    dateFrom,
    dateTo,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value),
    resetPage
  }
}
