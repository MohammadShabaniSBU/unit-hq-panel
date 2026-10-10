<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { NewsletterIssue, NewsletterList } from '~/types/newsletter'
import { Permission } from '~/types/permissions'

interface IssueRow {
  id: number
  issue: string
  name: string
  status: string
  sent: string
  scheduled: string
  counts: string
}

const route = useRoute()
const { t, locale } = useI18n()
const toast = useToast()
const { get, post } = useApi()
const { can } = usePermissions()
const { formatDateTime } = useOrgDateFormat()

const listId = computed(() => Number(route.params.id))
const canManage = computed(() => can(Permission.CampaignManage))
const pending = ref(true)
const creating = ref(false)
const error = ref(false)
const list = ref<NewsletterList | null>(null)
const issues = ref<Array<NewsletterIssue>>([])

const title = computed(() => {
  const current = list.value
  if (!current) {
    return t('pages.newsletters.issuesTitle')
  }

  return current.labels[locale.value] || current.labels.en || current.key
})

const hasSent = computed(() => issues.value.some(issue => issue.status === 'sent'))

const rows = computed<Array<IssueRow>>(() => issues.value.map(issue => ({
  id: issue.id,
  issue: issue.newsletter_issue_number === null
    ? t('common.emptyValue')
    : String(issue.newsletter_issue_number),
  name: issue.name,
  status: t(`pages.newsletters.statuses.${issue.status}`),
  sent: formatDateTime(issue.sent_at, { empty: t('common.emptyValue') }),
  scheduled: formatDateTime(issue.scheduled_at, { empty: t('common.emptyValue') }),
  counts: t('pages.newsletters.counts', {
    sent: issue.counts.sent,
    skipped: issue.counts.skipped
  })
})))

const columns = computed<Array<TableColumn<IssueRow>>>(() => [
  { accessorKey: 'issue', header: t('pages.newsletters.columns.issue') },
  {
    accessorKey: 'name',
    header: t('pages.newsletters.columns.name'),
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: `/marketing/campaigns/${row.original.id}`,
      class: 'font-medium text-highlighted hover:underline'
    }, () => row.original.name)
  },
  { accessorKey: 'status', header: t('pages.newsletters.columns.status') },
  { accessorKey: 'sent', header: t('pages.newsletters.columns.sent') },
  { accessorKey: 'scheduled', header: t('pages.newsletters.columns.scheduled') },
  { accessorKey: 'counts', header: t('pages.newsletters.columns.counts') }
])

watch(listId, () => {
  void load()
}, { immediate: true })

async function load() {
  if (!Number.isInteger(listId.value) || listId.value <= 0) {
    error.value = true
    pending.value = false
    return
  }

  pending.value = true
  error.value = false

  try {
    const [lists, issueResponse] = await Promise.all([
      get<Array<NewsletterList>>('/api/subscription-lists', { status: 'all' }),
      get<Array<NewsletterIssue>>(`/api/subscription-lists/${listId.value}/newsletters`)
    ])
    list.value = lists.data.find(item => item.id === listId.value) ?? null
    issues.value = issueResponse.data
    if (!list.value || list.value.kind !== 'newsletter') {
      error.value = true
    }
  } catch {
    error.value = true
    list.value = null
    issues.value = []
  } finally {
    pending.value = false
  }
}

async function createIssue() {
  if (!list.value) {
    return
  }

  creating.value = true

  try {
    if (hasSent.value) {
      const response = await post<{ id: number }>(`/api/subscription-lists/${list.value.id}/newsletters/next`, {})
      await navigateTo(`/marketing/campaigns/${response.data.id}`)
    } else {
      const label = list.value.labels[locale.value] || list.value.labels.en || list.value.key
      const response = await post<{ id: number }>('/api/campaigns', {
        type: 'newsletter',
        name: label,
        subscription_list_id: list.value.id
      })
      await navigateTo(`/marketing/campaigns/${response.data.id}`)
    }
  } catch {
    toast.add({
      title: t('pages.newsletters.newIssueError'),
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <NuxtLink
          to="/marketing/newsletters"
          class="text-sm text-dimmed hover:underline"
        >
          {{ t('pages.newsletters.back') }}
        </NuxtLink>
        <h1 class="mt-1 text-xl font-semibold text-highlighted">
          {{ title }}
        </h1>
      </div>
      <UButton
        v-if="canManage && list"
        :label="t('pages.newsletters.newIssue')"
        icon="i-lucide-plus"
        color="primary"
        :loading="creating"
        @click="createIssue"
      />
    </div>

    <div
      v-if="pending"
      class="flex h-48 items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="flex h-48 flex-col items-center justify-center gap-3"
    >
      <p class="text-sm text-dimmed">
        {{ t('pages.newsletters.loadError') }}
      </p>
      <UButton
        :label="t('common.retry')"
        variant="outline"
        color="neutral"
        @click="load"
      />
    </div>

    <div v-else>
      <p
        v-if="rows.length === 0"
        class="mb-4 text-sm text-dimmed"
      >
        {{ t('pages.newsletters.noIssue') }}
      </p>
      <UTable
        v-else
        :data="rows"
        :columns="columns"
      />
    </div>
  </UContainer>
</template>
