import {
  CONTACT_LIFECYCLE_STATUSES,
  type ApiContact,
  type ContactLifecycleStatus,
  type ContactStatusFilter,
  type ContactTabCounts
} from '~/types/contact'
import type { FilterGroup } from '~/types/filter'
import { countFilterConditions } from '~/types/filter'

const EMPTY_TAB_COUNTS: ContactTabCounts = {
  all: 0,
  prospect: 0,
  lead: 0,
  opportunity: 0,
  tenant: 0,
  past_tenant: 0,
  lost: 0
}

function buildListQuery(page: number, perPage: number, statusFilter: ContactStatusFilter, searchQuery: string) {
  const query: Record<string, string | number> = {
    page,
    per_page: perPage
  }

  if (statusFilter !== 'all') {
    query.status = statusFilter
  }

  const search = searchQuery.trim()
  if (search) {
    query.search = search
  }

  return query
}

function buildCountQuery(status?: ContactLifecycleStatus) {
  const query: Record<string, string | number> = {
    page: 1,
    per_page: 1
  }

  if (status) {
    query.status = status
  }

  return query
}

function buildSearchBody(
  page: number,
  perPage: number,
  statusFilter: ContactStatusFilter,
  searchQuery: string,
  filter: FilterGroup
) {
  const body: Record<string, unknown> = {
    page,
    per_page: perPage,
    filter
  }

  if (statusFilter !== 'all') {
    body.status = statusFilter
  }

  const search = searchQuery.trim()
  if (search) {
    body.search = search
  }

  return body
}

export function useContactsList(options?: {
  filter?: Ref<FilterGroup | null>
}) {
  const { getPaginated, postPaginated } = useApi()
  const searchQuery = ref('')
  const statusFilter = ref<ContactStatusFilter>('all')
  const selectedIds = ref<Array<string>>([])
  const tabCounts = ref<ContactTabCounts>({ ...EMPTY_TAB_COUNTS })
  const filter = options?.filter ?? ref<FilterGroup | null>(null)
  const { page, perPage, perPageOptions, resetPage, goToPrevPage, goToNextPage, goToPage } = useListPagination()

  const { data, pending, error, refresh } = useAsyncData(
    'contacts',
    () => {
      if (countFilterConditions(filter.value) > 0 && filter.value) {
        return postPaginated<ApiContact>(
          '/api/contacts/search',
          buildSearchBody(page.value, perPage.value, statusFilter.value, searchQuery.value, filter.value)
        )
      }

      return getPaginated<ApiContact>(
        '/api/contacts',
        buildListQuery(page.value, perPage.value, statusFilter.value, searchQuery.value)
      )
    },
    { watch: [page, perPage, searchQuery, statusFilter, filter] }
  )

  async function refreshTabCounts() {
    const [allResponse, ...statusResponses] = await Promise.all([
      getPaginated<ApiContact>('/api/contacts', buildCountQuery()),
      ...CONTACT_LIFECYCLE_STATUSES.map(status =>
        getPaginated<ApiContact>('/api/contacts', buildCountQuery(status))
      )
    ])

    tabCounts.value = {
      all: allResponse.meta.total,
      prospect: statusResponses[0]?.meta.total ?? 0,
      lead: statusResponses[1]?.meta.total ?? 0,
      opportunity: statusResponses[2]?.meta.total ?? 0,
      tenant: statusResponses[3]?.meta.total ?? 0,
      past_tenant: statusResponses[4]?.meta.total ?? 0,
      lost: statusResponses[5]?.meta.total ?? 0
    }
  }

  async function refreshAll() {
    await refresh()
    await refreshTabCounts()
  }

  onMounted(() => {
    refreshTabCounts()
  })

  const paginatedContacts = computed(() => data.value?.data ?? [])
  const totalCount = computed(() => data.value?.meta.total ?? 0)
  const showingCount = computed(() => paginatedContacts.value.length)
  const lastPage = computed(() => data.value?.meta.last_page ?? 1)
  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < lastPage.value)

  watch([searchQuery, statusFilter, filter], () => {
    resetPage()
    selectedIds.value = []
  })

  function setStatusFilter(filterValue: ContactStatusFilter) {
    statusFilter.value = filterValue
  }

  function toggleSelected(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(selectedId => selectedId !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }

  function toggleAllSelected() {
    const pageIds = paginatedContacts.value.map(contact => String(contact.id))
    const allSelected = pageIds.every(id => selectedIds.value.includes(id))

    if (allSelected) {
      selectedIds.value = selectedIds.value.filter(id => !pageIds.includes(id))
    } else {
      selectedIds.value = [...new Set([...selectedIds.value, ...pageIds])]
    }
  }

  const isAllPageSelected = computed(() => {
    const pageIds = paginatedContacts.value.map(contact => String(contact.id))
    return pageIds.length > 0 && pageIds.every(id => selectedIds.value.includes(id))
  })

  const isSomePageSelected = computed(() => {
    const pageIds = paginatedContacts.value.map(contact => String(contact.id))
    return pageIds.some(id => selectedIds.value.includes(id)) && !isAllPageSelected.value
  })

  return {
    searchQuery,
    statusFilter,
    page,
    perPage,
    perPageOptions,
    selectedIds,
    tabCounts,
    paginatedContacts,
    totalCount,
    showingCount,
    lastPage,
    canGoPrev,
    canGoNext,
    isAllPageSelected,
    isSomePageSelected,
    pending,
    error,
    refresh: refreshAll,
    setStatusFilter,
    goToPrevPage,
    goToNextPage: () => goToNextPage(lastPage.value),
    goToPage: (targetPage: number) => goToPage(targetPage, lastPage.value),
    toggleSelected,
    toggleAllSelected
  }
}

export function useContactFormatters() {
  const { t, locale } = useI18n()

  function formatContactName(contact: { first_name: string, last_name: string }) {
    return [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  }

  function formatContactInitials(contact: { first_name: string, last_name: string }) {
    return [contact.first_name, contact.last_name]
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function formatRelativeActivity(isoDate: string) {
    const date = new Date(isoDate)
    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 60) {
      return t('relativeTime.minutesAgo', { count: Math.max(diffMinutes, 1) })
    }

    if (diffHours < 24) {
      return t('relativeTime.hoursAgo', { count: diffHours })
    }

    if (diffDays === 1) {
      return t('relativeTime.yesterday')
    }

    if (diffDays < 7) {
      return t('relativeTime.daysAgo', { count: diffDays })
    }

    return date.toLocaleDateString(locale.value === 'es' ? 'es-ES' : 'en-GB', {
      day: 'numeric',
      month: 'short'
    })
  }

  return {
    formatContactName,
    formatContactInitials,
    formatRelativeActivity
  }
}
