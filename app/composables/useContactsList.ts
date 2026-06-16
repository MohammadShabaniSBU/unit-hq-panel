import type { Contact, ContactSortOrder, ContactStatusFilter } from '~/types/contact'
import { contactTabCounts, mockContacts } from '~/data/contacts.mock'

const PAGE_SIZE = 9

function matchesSearch(contact: Contact, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [
    contact.name,
    contact.email,
    contact.phone ?? ''
  ].some(value => value.toLowerCase().includes(normalized))
}

function sortContacts(contacts: Contact[], order: ContactSortOrder) {
  const sorted = [...contacts].sort(
    (a, b) => new Date(b.lastActivity.at).getTime() - new Date(a.lastActivity.at).getTime()
  )

  return order === 'newest' ? sorted : sorted.reverse()
}

export function useContactsList() {
  const searchQuery = ref('')
  const statusFilter = ref<ContactStatusFilter>('all')
  const sortOrder = ref<ContactSortOrder>('newest')
  const page = ref(1)
  const selectedIds = ref<string[]>([])

  const filteredContacts = computed(() => {
    let results = mockContacts.filter(contact => matchesSearch(contact, searchQuery.value))

    if (statusFilter.value !== 'all') {
      results = results.filter(contact => contact.status === statusFilter.value)
    }

    return sortContacts(results, sortOrder.value)
  })

  const totalCount = computed(() => {
    const hasFilters = searchQuery.value.trim() !== '' || statusFilter.value !== 'all'
    if (!hasFilters) {
      return contactTabCounts.all
    }

    return filteredContacts.value.length
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(filteredContacts.value.length / PAGE_SIZE)))

  const paginatedContacts = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filteredContacts.value.slice(start, start + PAGE_SIZE)
  })

  const showingCount = computed(() => paginatedContacts.value.length)

  const canGoPrev = computed(() => page.value > 1)
  const canGoNext = computed(() => page.value < pageCount.value)

  watch([searchQuery, statusFilter, sortOrder], () => {
    page.value = 1
    selectedIds.value = []
  })

  function setStatusFilter(filter: ContactStatusFilter) {
    statusFilter.value = filter
  }

  function setSortOrder(order: ContactSortOrder) {
    sortOrder.value = order
  }

  function goToPrevPage() {
    if (canGoPrev.value) {
      page.value -= 1
    }
  }

  function goToNextPage() {
    if (canGoNext.value) {
      page.value += 1
    }
  }

  function toggleSelected(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(selectedId => selectedId !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }

  function toggleAllSelected() {
    const pageIds = paginatedContacts.value.map(contact => contact.id)
    const allSelected = pageIds.every(id => selectedIds.value.includes(id))

    if (allSelected) {
      selectedIds.value = selectedIds.value.filter(id => !pageIds.includes(id))
    } else {
      selectedIds.value = [...new Set([...selectedIds.value, ...pageIds])]
    }
  }

  const isAllPageSelected = computed(() => {
    const pageIds = paginatedContacts.value.map(contact => contact.id)
    return pageIds.length > 0 && pageIds.every(id => selectedIds.value.includes(id))
  })

  const isSomePageSelected = computed(() => {
    const pageIds = paginatedContacts.value.map(contact => contact.id)
    return pageIds.some(id => selectedIds.value.includes(id)) && !isAllPageSelected.value
  })

  return {
    searchQuery,
    statusFilter,
    sortOrder,
    page,
    selectedIds,
    tabCounts: contactTabCounts,
    filteredContacts,
    paginatedContacts,
    totalCount,
    showingCount,
    pageSize: PAGE_SIZE,
    canGoPrev,
    canGoNext,
    isAllPageSelected,
    isSomePageSelected,
    setStatusFilter,
    setSortOrder,
    goToPrevPage,
    goToNextPage,
    toggleSelected,
    toggleAllSelected
  }
}

export function useContactFormatters() {
  const { t, locale } = useI18n()

  function formatContactInitials(name: string) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function formatContactBalance(amount: number) {
    return new Intl.NumberFormat(locale.value === 'es' ? 'es-ES' : 'en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
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

  function formatContactType(type: Contact['type']) {
    return type === 'individual' ? t('contactType.individual') : t('contactType.business')
  }

  function activityChannelLabel(channel: keyof typeof activityChannelIcons) {
    return t(`activityChannel.${channel}`)
  }

  function contactStatusLabel(status: Contact['status']) {
    return t(`status.contact.${status}`)
  }

  return {
    formatContactInitials,
    formatContactBalance,
    formatRelativeActivity,
    formatContactType,
    activityChannelLabel,
    contactStatusLabel
  }
}

export const activityChannelIcons = {
  whatsapp: 'i-lucide-message-circle',
  email: 'i-lucide-mail',
  phone: 'i-lucide-phone'
} as const

export const statusColors = {
  lead: 'neutral',
  reserved: 'warning',
  active: 'success',
  overdue: 'error'
} as const
