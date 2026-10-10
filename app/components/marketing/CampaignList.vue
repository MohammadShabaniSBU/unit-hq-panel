<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { Campaign, CampaignTypeName } from '~/types/campaign'
import { campaignDetailPath } from '~/types/campaign'
import { Permission } from '~/types/permissions'

interface ListOption {
  id: number
  key: string
  labels: Record<string, string>
}

const props = defineProps<{
  type: CampaignTypeName
}>()

const { t, locale } = useI18n()
const { can } = usePermissions()
const { get } = useApi()
const { formatDateTime } = useOrgDateFormat()
const { items: siteItems } = useOptions('/api/sites/options')
const {
  page,
  perPage,
  status,
  awaitingMe,
  rows,
  pending,
  error,
  lastPage,
  total,
  showingCount,
  canGoPrev,
  canGoNext,
  refresh,
  goToPrevPage,
  goToNextPage,
  goToPage
} = useCampaignList(props.type)

const lists = ref<Array<ListOption>>([])
const UBadge = resolveComponent('UBadge')

const canCreate = computed(() => props.type === 'announcement'
  ? can(Permission.AnnouncementSend)
  : can(Permission.CampaignManage))

const canApprove = computed(() => can(Permission.CampaignApprove))

const titleKey = computed(() => props.type === 'announcement'
  ? 'pages.campaigns.announcementTitle'
  : 'pages.campaigns.title')

const newPath = computed(() => props.type === 'announcement'
  ? '/marketing/announcements/new'
  : '/marketing/campaigns/new')

const newLabelKey = computed(() => props.type === 'announcement'
  ? 'pages.campaigns.newAnnouncement'
  : 'pages.campaigns.newCampaign')

const statuses = [
  'draft',
  'pending_approval',
  'scheduled',
  'sending',
  'paused',
  'sent',
  'cancelled'
] as const

const statusItems = computed(() => [
  { label: t('pages.campaigns.allStatuses'), value: 'all' },
  ...statuses.map(value => ({
    label: t(`pages.campaigns.statuses.${value}`),
    value
  }))
])

const columns = computed<Array<TableColumn<Campaign>>>(() => [
  {
    accessorKey: 'name',
    header: t('pages.campaigns.columns.name'),
    cell: ({ row }) => h('span', {
      class: 'font-medium text-highlighted'
    }, row.original.name)
  },
  {
    accessorKey: 'status',
    header: t('pages.campaigns.columns.status'),
    cell: ({ row }) => h(UBadge, {
      color: statusColor(row.original.status),
      variant: 'subtle',
      size: 'sm',
      label: t(`pages.campaigns.statuses.${row.original.status}`)
    })
  },
  {
    id: 'audience',
    header: t('pages.campaigns.columns.audience'),
    cell: ({ row }) => audienceLabel(row.original)
  },
  {
    id: 'when',
    header: t('pages.campaigns.columns.scheduled'),
    cell: ({ row }) => whenLabel(row.original)
  },
  {
    id: 'recipients',
    header: t('pages.campaigns.columns.recipients'),
    cell: ({ row }) => recipientCount(row.original)
  },
  {
    id: 'openRate',
    header: t('pages.campaigns.columns.openRate'),
    cell: ({ row }) => formatRate(row.original.open_rate)
  }
])

onMounted(() => {
  void get<Array<ListOption>>('/api/subscription-lists').then((response) => {
    lists.value = response.data
  }).catch(() => {
    lists.value = []
  })
})

function statusColor(statusName: string) {
  if (statusName === 'pending_approval' || statusName === 'paused') {
    return 'warning'
  }
  if (statusName === 'scheduled' || statusName === 'sending') {
    return 'primary'
  }
  if (statusName === 'sent') {
    return 'success'
  }
  if (statusName === 'cancelled') {
    return 'error'
  }
  return 'neutral'
}

function listLabel(id: number | null) {
  const list = lists.value.find(item => item.id === id)
  if (!list) {
    return t('common.emptyValue')
  }
  return list.labels[locale.value] || list.labels.en || list.key
}

function audienceLabel(campaign: Campaign) {
  if (campaign.type === 'announcement') {
    const names = campaign.site_ids
      .map(id => siteItems.value.find(site => Number(site.value) === id)?.label)
      .filter((name): name is string => Boolean(name))
    return names.length > 0 ? names.join(', ') : t('common.emptyValue')
  }
  return listLabel(campaign.subscription_list_id)
}

function whenLabel(campaign: Campaign) {
  const completed = campaign.sends
    .map(send => send.completed_at)
    .filter((value): value is string => Boolean(value))
    .sort()
  if (completed.length > 0) {
    return formatDateTime(completed[completed.length - 1] ?? null, { empty: t('common.emptyValue') })
  }
  if (campaign.sends.some(send => send.scheduled_at === 'now')) {
    return t('pages.campaigns.now')
  }
  const scheduled = campaign.sends
    .map(send => send.scheduled_at)
    .filter((value): value is string => Boolean(value) && value !== 'now')
    .sort()
  return formatDateTime(scheduled[0] ?? null, { empty: t('common.emptyValue') })
}

function recipientCount(campaign: Campaign) {
  const counts = campaign.counts
  if (!counts) {
    return String(campaign.estimated_recipients ?? 0)
  }
  const sum = counts.pending + counts.claimed + counts.sent + counts.skipped + counts.failed
  return String(sum > 0 ? sum : (campaign.estimated_recipients ?? 0))
}

function formatRate(rate: number | null) {
  if (rate == null) {
    return t('common.emptyValue')
  }
  return `${(rate * 100).toFixed(1)}%`
}

function toggleAwaiting() {
  awaitingMe.value = !awaitingMe.value
  if (awaitingMe.value) {
    status.value = 'all'
  }
}

function onRowSelect(_event: Event, row: TableRow<Campaign>) {
  if (pending.value) {
    return
  }

  navigateTo(campaignDetailPath(row.original.type, row.original.id))
}
</script>

<template>
  <UContainer class="py-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ t(titleKey) }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ t(type === 'announcement' ? 'pages.campaigns.announcementSubtitle' : 'pages.campaigns.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="canCreate"
        :to="newPath"
        icon="i-lucide-plus"
        color="primary"
        class="shrink-0"
        :label="t(newLabelKey)"
      />
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <USelect
        v-model="status"
        :items="statusItems"
        value-key="value"
        class="w-52"
        :disabled="awaitingMe"
      />
      <UButton
        v-if="canApprove"
        :label="t('pages.campaigns.awaitingMine')"
        :variant="awaitingMe ? 'solid' : 'outline'"
        color="neutral"
        @click="toggleAwaiting"
      />
    </div>

    <div
      v-if="pending && rows.length === 0"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error && rows.length === 0"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ t('pages.campaigns.loadError') }}
      </p>
      <UButton
        :label="t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh"
      />
    </div>

    <template v-else>
      <p
        v-if="rows.length === 0"
        class="mt-6 text-sm text-dimmed"
      >
        {{ t('pages.campaigns.empty') }}
      </p>

      <div
        v-else
        class="mt-4"
        :class="pending ? '[&_tbody_tr]:pointer-events-none [&_tbody_tr]:cursor-wait' : ''"
        style="max-height: calc(100vh - 320px)"
      >
        <UTable
          :data="rows"
          :columns="columns"
          :loading="pending"
          :meta="{ class: { tr: 'cursor-pointer' } }"
          @select="onRowSelect"
        />
      </div>

      <FacilityListPagination
        v-model:per-page="perPage"
        :page="page"
        :total-pages="lastPage"
        :showing-count="showingCount"
        :total-count="total"
        :can-go-prev="canGoPrev"
        :can-go-next="canGoNext"
        @prev="goToPrevPage"
        @next="goToNextPage"
        @go-to-page="goToPage"
      />
    </template>
  </UContainer>
</template>
