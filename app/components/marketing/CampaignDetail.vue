<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import DOMPurify from 'dompurify'
import type {
  Campaign,
  CampaignContentPreview,
  CampaignRecipientRow,
  CampaignReport
} from '~/types/campaign'
import { campaignDetailPath, readFieldErrors } from '~/types/campaign'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  campaign: Campaign
}>()

const emit = defineEmits<{
  changed: [campaign: Campaign]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuthStore()
const { can } = usePermissions()
const api = useCampaignApi()
const { downloadBlob } = useApi()

const tab = ref('report')
const { totalCount: activityTotal } = useActivityList({
  subjectType: 'campaign',
  subjectId: computed(() => props.campaign.id),
  perPage: 1
})
const report = ref<CampaignReport | null>(null)
const reportError = ref(false)
const exporting = ref(false)
const recipients = ref<Array<CampaignRecipientRow>>([])
const recipientStatus = ref('all')
const recipientReason = ref('all')
const recipientQuery = ref('')
const recipientPage = ref(1)
const recipientLastPage = ref(1)
const recipientsPending = ref(false)
const rejectOpen = ref(false)
const rejectReason = ref('')
const acting = ref(false)
const preview = ref<CampaignContentPreview | null>(null)
const previewOpen = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const canManage = computed(() => props.campaign.type === 'announcement'
  ? can(Permission.AnnouncementSend)
  : can(Permission.CampaignManage))

const canApprove = computed(() => can(Permission.CampaignApprove)
  && props.campaign.status === 'pending_approval'
  && props.campaign.submitted_by !== auth.employee?.id)

const listPath = computed(() => {
  if (props.campaign.type === 'announcement') {
    return '/marketing/announcements'
  }
  if (props.campaign.type === 'newsletter' && props.campaign.subscription_list_id) {
    return `/marketing/newsletters/${props.campaign.subscription_list_id}`
  }
  return '/marketing/campaigns'
})

const backLabelKey = computed(() => {
  if (props.campaign.type === 'announcement') {
    return 'pages.campaigns.backToAnnouncements'
  }
  if (props.campaign.type === 'newsletter') {
    return 'pages.campaigns.backToNewsletters'
  }
  return 'pages.campaigns.backToCampaigns'
})

const statusColor = computed(() => {
  switch (props.campaign.status) {
    case 'scheduled':
    case 'pending_approval':
      return 'warning'
    case 'sending':
      return 'primary'
    case 'sent':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'neutral'
  }
})

const templateSend = computed(() => props.campaign.sends.find(send => send.channel === 'email' && send.template_family_name)
  ?? props.campaign.sends.find(send => send.template_family_name)
  ?? null)

const templateLabel = computed(() => {
  const send = templateSend.value
  if (!send?.template_family_name) {
    return null
  }
  if (send.version_number == null) {
    return send.template_family_name
  }
  return t('pages.campaigns.pinnedVersion', {
    name: send.template_family_name,
    version: send.version_number
  })
})

const creatorInitials = computed(() => {
  const name = props.campaign.creator?.name?.trim() ?? ''
  if (name === '') {
    return ''
  }
  return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('')
})

const recipientBadge = computed(() => {
  const counts = props.campaign.counts
  if (!counts) {
    return t('common.emptyValue')
  }
  return String(counts.pending + counts.claimed + counts.sent + counts.skipped + counts.failed)
})

const tabItems = computed(() => [
  { label: t('pages.campaigns.tabs.report'), value: 'report' },
  {
    label: t('pages.campaigns.tabs.recipients'),
    value: 'recipients',
    badge: { label: recipientBadge.value, color: 'neutral' as const, variant: 'subtle' as const }
  },
  {
    label: t('pages.campaigns.tabs.activity'),
    value: 'activity',
    badge: { label: String(activityTotal.value), color: 'neutral' as const, variant: 'subtle' as const }
  }
])

const progress = computed(() => {
  const counts = props.campaign.counts
  if (!counts) {
    return 0
  }
  const total = counts.pending + counts.claimed + counts.sent + counts.skipped + counts.failed
  if (total === 0) {
    return 0
  }
  return Math.round(((counts.sent + counts.skipped + counts.failed) / total) * 100)
})

const awaitingSend = computed(() => (report.value?.total.targeted ?? 0) === 0)
const sentReport = computed(() => props.campaign.status === 'sent')

function share(part: number, whole: number): number | null {
  if (whole <= 0) {
    return part === 0 ? 0 : null
  }
  return part / whole
}

function formatPercent(rate: number | null): string {
  if (rate == null) {
    return t('common.emptyValue')
  }
  const whole = rate >= 0.9995
  const digits = whole ? 0 : (rate > 0 && rate < 0.01 ? 2 : 1)
  return new Intl.NumberFormat(locale.value, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(whole ? 1 : rate)
}

function funnelCaption(key: string, value: number, targeted: number, sentCount: number, delivered: number): string {
  if (key === 'targeted') {
    return t('pages.campaigns.funnel.audienceAtSend', {
      percent: formatPercent(targeted > 0 ? 1 : 0)
    })
  }
  if (key === 'sent') {
    return t('pages.campaigns.funnel.ofTargeted', { percent: formatPercent(share(value, targeted)) })
  }
  if (key === 'delivered') {
    return t('pages.campaigns.funnel.ofSent', { percent: formatPercent(share(value, sentCount)) })
  }
  return t('pages.campaigns.funnel.ofDelivered', { percent: formatPercent(share(value, delivered)) })
}

const funnelSteps = computed(() => {
  const total = report.value?.total
  const targeted = total?.targeted ?? 0
  const sentCount = total?.sent ?? 0
  const delivered = total?.delivered ?? 0
  const rows = [
    { key: 'targeted', index: '01', value: targeted, rate: null, caption: 'audienceSize', star: false },
    { key: 'sent', index: '02', value: sentCount, rate: share(sentCount, targeted), caption: 'pctTargeted', star: false },
    { key: 'delivered', index: '03', value: delivered, rate: share(delivered, sentCount), caption: 'pctSent', star: false },
    { key: 'opened', index: '04', value: total?.opened ?? 0, rate: total?.rates.opened ?? null, caption: 'pctDelivered', star: true },
    { key: 'clicked', index: '05', value: total?.clicked ?? 0, rate: total?.rates.clicked ?? null, caption: 'pctDelivered', star: false }
  ]
  return rows.map(row => ({
    ...row,
    shareOfTargeted: row.key === 'targeted'
      ? (targeted > 0 ? 1 : null)
      : share(row.value, targeted),
    sentCaption: funnelCaption(row.key, row.value, targeted, sentCount, delivered)
  }))
})

function healthCaption(key: string, value: number, targeted: number, delivered: number, fallback: string): string {
  if (key === 'failed') {
    return value === 0
      ? t('pages.campaigns.deliverability.noneRejected')
      : t('pages.campaigns.deliverability.rejected')
  }
  const labelKey = key === 'skipped'
    ? 'rateSuppressed'
    : key === 'bounced'
      ? 'rateReview'
      : key === 'complained'
        ? 'rateSpam'
        : 'rateOptedOut'
  const label = t(`pages.campaigns.deliverability.${labelKey}`)
  const rate = share(value, key === 'skipped' ? targeted : delivered)
  if (rate == null) {
    return t(`pages.campaigns.deliverability.${fallback}`)
  }
  return t('pages.campaigns.deliverability.withRate', { percent: formatPercent(rate), label })
}

const healthSteps = computed(() => {
  const total = report.value?.total
  const targeted = total?.targeted ?? 0
  const delivered = total?.delivered ?? 0
  const rows = [
    { key: 'skipped', value: total?.skipped ?? 0, caption: 'suppressed' },
    { key: 'failed', value: total?.failed ?? 0, caption: 'rejected' },
    { key: 'bounced', value: total?.bounced ?? 0, caption: 'bounces' },
    { key: 'complained', value: total?.complained ?? 0, caption: 'spam' },
    { key: 'unsubscribed', value: total?.unsubscribed ?? 0, caption: 'optedOut' }
  ]
  return rows.map(row => ({
    ...row,
    sentCaption: healthCaption(row.key, row.value, targeted, delivered, row.caption)
  }))
})

const engagementSeries = computed(() => {
  const hours = report.value?.engagement?.hours ?? []
  return [
    { name: t('pages.campaigns.curve.clicks'), data: hours.map(row => row.clicked) },
    { name: t('pages.campaigns.curve.opens'), data: hours.map(row => row.opened) }
  ]
})

const engagementOptions = computed(() => {
  const hours = report.value?.engagement?.hours ?? []
  const categories = hours.map(row => `+${row.hour}h`)
  let peakIndex = 0
  let peakTotal = 0
  hours.forEach((row, index) => {
    const total = row.opened + row.clicked
    if (total > peakTotal) {
      peakTotal = total
      peakIndex = index
    }
  })

  return {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      fontFamily: 'inherit',
      animations: { enabled: false }
    },
    colors: ['#f97316', '#c4b5fd'],
    plotOptions: {
      bar: {
        columnWidth: '48%',
        borderRadius: 2
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      borderColor: 'rgba(128,128,128,0.25)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { top: 18, right: 8, left: 8, bottom: 0 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#9ca3af', fontSize: '12px' },
        formatter: (value: string) => {
          const hour = Number(String(value).replace('+', '').replace('h', ''))
          return Number.isFinite(hour) && hour % 4 === 0 ? value : ''
        }
      }
    },
    yaxis: {
      min: 0,
      max: peakTotal === 0 ? 1 : undefined,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    annotations: peakTotal > 0
      ? {
          points: [{
            x: categories[peakIndex],
            y: peakTotal,
            marker: { size: 0, strokeWidth: 0, fillColor: 'transparent', strokeColor: 'transparent' },
            label: {
              text: t('pages.campaigns.curve.perHour', { count: peakTotal }),
              offsetY: 0,
              borderColor: 'transparent',
              style: {
                background: 'transparent',
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: 500
              }
            }
          }]
        }
      : { points: [] },
    tooltip: { shared: true, intersect: false }
  }
})

function barWidth(rate: number | null) {
  if (rate == null || rate <= 0) {
    return '0%'
  }
  return `${Math.min(100, Math.round(rate * 1000) / 10)}%`
}

const recipientColumns = computed<Array<TableColumn<CampaignRecipientRow>>>(() => [
  {
    accessorKey: 'contact_name',
    header: t('pages.campaigns.columns.name'),
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: `/leasing/contacts/${row.original.contact_id}`,
      class: 'text-primary hover:underline'
    }, () => row.original.contact_name || t('common.emptyValue'))
  },
  {
    accessorKey: 'status',
    header: t('pages.campaigns.columns.status'),
    cell: ({ row }) => t(`pages.campaigns.recipientStatuses.${row.original.status}`)
  },
  {
    id: 'reason',
    header: t('pages.campaigns.columns.skipReason'),
    cell: ({ row }) => row.original.skip_reason
      ? t(`pages.campaigns.skipReasons.${row.original.skip_reason}`)
      : t('common.emptyValue')
  },
  {
    id: 'message',
    header: t('pages.campaigns.columns.message'),
    cell: ({ row }) => row.original.message_id == null
      ? t('common.emptyValue')
      : h(resolveComponent('NuxtLink'), {
          to: `/leasing/contacts/${row.original.contact_id}`,
          class: 'text-primary hover:underline'
        }, () => t('pages.campaigns.messageLink', { id: row.original.message_id }))
  }
])

const statusItems = computed(() => [
  { label: t('pages.campaigns.allStatuses'), value: 'all' },
  ...['pending', 'claimed', 'sent', 'skipped', 'failed'].map(value => ({
    label: t(`pages.campaigns.recipientStatuses.${value}`),
    value
  }))
])

const reasonItems = computed(() => [
  { label: t('pages.campaigns.allReasons'), value: 'all' },
  ...Object.keys({
    no_consent: 1,
    suppressed: 1,
    frequency_capped: 1,
    excluded_delinquent: 1,
    excluded_playbook: 1,
    no_address: 1,
    out_of_scope: 1,
    channel_not_configured: 1,
    template_not_resolvable: 1,
    cancelled: 1
  }).map(value => ({
    label: t(`pages.campaigns.skipReasons.${value}`),
    value
  }))
])

const safeHtml = computed(() => preview.value?.html ? DOMPurify.sanitize(preview.value.html) : '')

const previewTitle = computed(() => {
  if (!preview.value || preview.value.version_number == null) {
    return preview.value?.channel || t('pages.campaigns.contentPreview')
  }
  return t('pages.campaigns.pinnedVersion', {
    name: preview.value.channel,
    version: preview.value.version_number
  })
})

onMounted(() => {
  void loadReport()
  syncPoll(props.campaign.status)
})

onUnmounted(() => {
  clearPoll()
})

watch(() => props.campaign.status, syncPoll)

watch(tab, (value) => {
  if (value === 'recipients') {
    void loadRecipients()
  }
})

watch([recipientStatus, recipientReason, recipientQuery], () => {
  recipientPage.value = 1
  if (tab.value === 'recipients') {
    void loadRecipients()
  }
})

function syncPoll(status: string) {
  if (status === 'sending' && timer == null) {
    timer = setInterval(() => {
      void refreshCampaign()
    }, 5000)
    return
  }
  if (status !== 'sending') {
    clearPoll()
  }
}

function clearPoll() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function refreshCampaign() {
  const next = await api.load(props.campaign.id)
  emit('changed', next)
  if (tab.value === 'report') {
    await loadReport()
  }
}

async function loadReport() {
  reportError.value = false
  try {
    report.value = await api.report(props.campaign.id)
  } catch {
    reportError.value = true
  }
}

async function loadRecipients() {
  recipientsPending.value = true
  const query: Record<string, string | number> = {
    page: recipientPage.value,
    per_page: 25
  }
  if (recipientStatus.value && recipientStatus.value !== 'all') {
    query.status = recipientStatus.value
  }
  if (recipientReason.value && recipientReason.value !== 'all') {
    query.skip_reason = recipientReason.value
  }
  if (recipientQuery.value.trim()) {
    query.q = recipientQuery.value.trim()
  }
  try {
    const response = await api.recipients(props.campaign.id, query)
    recipients.value = response.data
    recipientLastPage.value = response.meta.last_page
  } catch {
    recipients.value = []
  } finally {
    recipientsPending.value = false
  }
}

async function run(action: 'pause' | 'resume' | 'cancel' | 'approve') {
  acting.value = true
  try {
    const next = await api.transition(props.campaign.id, action)
    emit('changed', next)
    toast.add({ title: t(`pages.campaigns.actions.${action}`), color: 'success' })
  } catch (err) {
    const errors = readFieldErrors(err)
    toast.add({
      title: errors.status?.[0] ?? errors.approved_by?.[0] ?? t('pages.campaigns.saveError'),
      color: 'error'
    })
  } finally {
    acting.value = false
  }
}

async function onReject() {
  if (rejectReason.value.trim() === '') {
    return
  }
  acting.value = true
  try {
    const next = await api.reject(props.campaign.id, rejectReason.value.trim())
    rejectOpen.value = false
    emit('changed', next)
  } catch (err) {
    const errors = readFieldErrors(err)
    toast.add({ title: errors.reason?.[0] ?? t('pages.campaigns.saveError'), color: 'error' })
  } finally {
    acting.value = false
  }
}

async function onDuplicate() {
  acting.value = true
  try {
    const copy = await api.duplicate(props.campaign.id)
    await navigateTo(campaignDetailPath(copy.type, copy.id))
  } catch {
    toast.add({ title: t('pages.campaigns.saveError'), color: 'error' })
  } finally {
    acting.value = false
  }
}

async function exportRecipients() {
  if (!import.meta.client) {
    return
  }
  exporting.value = true
  try {
    const blob = await downloadBlob(`/api/campaigns/${props.campaign.id}/recipients/export`)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `campaign-${props.campaign.id}-recipients.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    toast.add({ title: t('pages.campaigns.exportError'), color: 'error' })
  } finally {
    exporting.value = false
  }
}

async function openPreview(channel: 'email' | 'sms') {
  try {
    preview.value = await api.contentPreview(props.campaign.id, channel, null)
    previewOpen.value = true
  } catch {
    toast.add({ title: t('pages.campaigns.saveError'), color: 'error' })
  }
}
</script>

<template>
  <UContainer class="py-8">
    <UButton
      :to="listPath"
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-arrow-left"
      class="-ms-2"
      :label="t(backLabelKey)"
    />

    <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
            {{ campaign.name }}
          </h1>
          <UBadge
            v-if="sentReport"
            :label="t(`pages.campaigns.statuses.${campaign.status}`)"
            color="neutral"
            variant="solid"
            icon="i-lucide-check"
          />
          <UBadge
            v-else
            :label="t(`pages.campaigns.statuses.${campaign.status}`)"
            :color="statusColor"
            variant="subtle"
          />
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-toned">
          <span
            v-if="templateLabel"
            class="inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-1"
          >
            <UIcon
              name="i-lucide-mail"
              class="size-3.5 text-dimmed"
            />
            {{ templateLabel }}
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="size-1.5 rounded-full bg-warning" />
            {{ t(`pages.campaigns.types.${campaign.type}`) }}
          </span>
          <span
            v-if="campaign.creator"
            class="inline-flex items-center gap-1.5"
          >
            <UAvatar
              :text="creatorInitials"
              size="2xs"
              class="bg-inverted text-inverted"
            />
            {{ campaign.creator.name }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="send in campaign.sends"
          :key="send.id"
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-eye"
          :label="t('pages.campaigns.openPreview', { channel: t(`pages.campaigns.channels.${send.channel}`) })"
          @click="openPreview(send.channel)"
        />
        <UButton
          v-if="sentReport"
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-download"
          :loading="exporting"
          :label="t('pages.campaigns.actions.exportCsv')"
          @click="exportRecipients"
        />
        <UButton
          v-if="canManage"
          size="sm"
          :variant="sentReport ? 'solid' : 'outline'"
          color="neutral"
          icon="i-lucide-copy"
          :loading="acting"
          :label="t('pages.campaigns.actions.duplicate')"
          @click="onDuplicate"
        />
        <UButton
          v-if="canManage && campaign.status === 'sending'"
          size="sm"
          :loading="acting"
          :label="t('pages.campaigns.actions.pause')"
          @click="run('pause')"
        />
        <UButton
          v-if="canManage && campaign.status === 'paused'"
          size="sm"
          :loading="acting"
          :label="t('pages.campaigns.actions.resume')"
          @click="run('resume')"
        />
        <UButton
          v-if="canApprove"
          size="sm"
          color="primary"
          :loading="acting"
          :label="t('pages.campaigns.actions.approve')"
          @click="run('approve')"
        />
        <UButton
          v-if="canApprove"
          size="sm"
          variant="outline"
          color="neutral"
          :label="t('pages.campaigns.actions.reject')"
          @click="rejectOpen = true"
        />
        <UButton
          v-if="canManage && (campaign.status === 'scheduled' || campaign.status === 'sending' || campaign.status === 'paused')"
          size="sm"
          color="error"
          variant="link"
          :loading="acting"
          :label="t('pages.campaigns.actions.cancelSend')"
          @click="run('cancel')"
        />
      </div>
    </div>

    <div
      v-if="campaign.status === 'sending' || campaign.status === 'paused'"
      class="mt-6"
    >
      <div class="mb-1 flex justify-between text-sm text-dimmed">
        <span>{{ t('pages.campaigns.progress') }}</span>
        <span>{{ progress }}%</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-elevated">
        <div
          class="h-full bg-primary"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <div
      v-if="rejectOpen"
      class="mt-4 flex max-w-xl flex-col gap-2"
    >
      <UTextarea
        v-model="rejectReason"
        :placeholder="t('pages.campaigns.rejectReason')"
      />
      <UButton
        class="self-start"
        :label="t('pages.campaigns.actions.reject')"
        :loading="acting"
        @click="onReject"
      />
    </div>

    <UModal
      v-model:open="previewOpen"
      :title="previewTitle"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <iframe
          v-if="safeHtml"
          class="h-[36rem] w-full rounded-md border border-default bg-white"
          sandbox=""
          :srcdoc="safeHtml"
          :title="t('pages.campaigns.contentPreview')"
        />
        <pre
          v-else
          class="whitespace-pre-wrap text-sm"
        >{{ preview?.text }}</pre>
      </template>
    </UModal>

    <UTabs
      v-model="tab"
      :items="tabItems"
      variant="link"
      color="primary"
      :content="false"
      class="mt-8"
      :ui="{ trigger: 'data-[state=active]:text-highlighted' }"
    />

    <div
      v-if="tab === 'report'"
      class="mt-8"
    >
      <p
        v-if="reportError"
        class="text-sm text-error"
      >
        {{ t('pages.campaigns.loadError') }}
      </p>
      <template v-else-if="report">
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="text-base font-semibold text-highlighted">
            {{ t('pages.campaigns.funnel.title') }}
          </h2>
          <p
            v-if="sentReport"
            class="text-sm text-dimmed"
          >
            {{ t('pages.campaigns.funnel.bars') }}
          </p>
          <p
            v-else-if="awaitingSend"
            class="text-sm text-dimmed"
          >
            {{ t('pages.campaigns.funnel.live') }}
          </p>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div
            v-for="step in funnelSteps"
            :key="step.key"
            class="rounded-xl bg-elevated p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm text-dimmed">
                {{ t(`pages.campaigns.metrics.${step.key}`) }}<span
                  v-if="step.star"
                  class="text-warning"
                >*</span>
              </p>
              <p class="text-xs tabular-nums text-dimmed">
                {{ step.index }}
              </p>
            </div>
            <p class="mt-3 text-2xl font-semibold tracking-tight text-highlighted">
              {{ !sentReport && awaitingSend ? t('common.emptyValue') : step.value }}
            </p>
            <div class="mt-3 h-1 overflow-hidden rounded-full bg-accented">
              <div
                class="h-full rounded-full"
                :class="sentReport ? (step.key === 'clicked' ? 'bg-warning' : 'bg-inverted') : 'bg-primary'"
                :style="{ width: !sentReport && awaitingSend ? '0%' : barWidth(sentReport ? step.shareOfTargeted : step.rate) }"
              />
            </div>
            <p class="mt-3 text-xs text-dimmed">
              {{ sentReport ? step.sentCaption : t(`pages.campaigns.funnel.${step.caption}`) }}
            </p>
          </div>
        </div>
        <p
          v-if="report.opens_approximate"
          class="mt-3 text-xs text-dimmed"
        >
          <span class="text-warning">*</span>
          {{ t('pages.campaigns.opensApproximate') }}
        </p>

        <template v-if="sentReport">
          <div class="mt-8 flex items-baseline justify-between gap-4">
            <h2 class="text-base font-semibold text-highlighted">
              {{ t('pages.campaigns.curve.engagement') }}
            </h2>
            <div class="flex items-center gap-4 text-sm text-dimmed">
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-[#c4b5fd]" />
                {{ t('pages.campaigns.curve.opens') }}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-[#f97316]" />
                {{ t('pages.campaigns.curve.clicks') }}
              </span>
            </div>
          </div>
          <div class="mt-4 rounded-xl bg-elevated px-2 pt-2 shadow-sm">
            <apexchart
              type="bar"
              height="240"
              :options="engagementOptions"
              :series="engagementSeries"
            />
          </div>
        </template>

        <h2 class="mt-8 text-base font-semibold text-highlighted">
          {{ t('pages.campaigns.deliverability.title') }}
        </h2>
        <div class="mt-4 grid grid-cols-1 divide-y divide-default overflow-hidden rounded-xl bg-elevated shadow-sm sm:grid-cols-5 sm:divide-x sm:divide-y-0">
          <div
            v-for="step in healthSteps"
            :key="step.key"
            class="p-4"
          >
            <p class="text-sm text-dimmed">
              {{ t(`pages.campaigns.metrics.${step.key}`) }}
            </p>
            <div class="mt-3 flex items-center gap-2">
              <p class="text-2xl font-semibold tracking-tight text-highlighted">
                {{ !sentReport && awaitingSend ? t('common.emptyValue') : step.value }}
              </p>
              <UBadge
                v-if="sentReport && step.key === 'complained' && step.value >= 1"
                color="error"
                variant="subtle"
                size="sm"
                :label="t('pages.campaigns.deliverability.watch')"
              />
            </div>
            <p class="mt-3 text-xs text-dimmed">
              {{ sentReport ? step.sentCaption : t(`pages.campaigns.deliverability.${step.caption}`) }}
            </p>
          </div>
        </div>

        <div
          v-if="!sentReport"
          class="mt-8 flex items-baseline justify-between gap-4"
        >
          <h2 class="text-base font-semibold text-highlighted">
            {{ t('pages.campaigns.curve.title') }}
          </h2>
          <p class="text-sm text-dimmed">
            {{ t('pages.campaigns.curve.axis') }}
          </p>
        </div>
        <div
          v-if="!sentReport"
          class="relative mt-4 overflow-hidden rounded-xl bg-elevated px-6 py-16 shadow-sm"
        >
          <div class="pointer-events-none absolute inset-x-8 top-8 border-t border-dashed border-default" />
          <div class="pointer-events-none absolute inset-x-8 top-1/2 border-t border-dashed border-default" />
          <div class="pointer-events-none absolute inset-x-8 bottom-8 border-t border-dashed border-default" />
          <div class="relative flex flex-col items-center text-center">
            <div class="flex size-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <UIcon
                name="i-lucide-trending-up"
                class="size-5"
              />
            </div>
            <p class="mt-4 text-sm font-semibold text-highlighted">
              {{ t('pages.campaigns.curve.emptyTitle') }}
            </p>
            <p class="mt-1 max-w-md text-sm text-dimmed">
              {{ t('pages.campaigns.curve.emptyBody') }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <div
      v-else-if="tab === 'recipients'"
      class="mt-6"
    >
      <div class="mb-4 flex flex-wrap gap-2">
        <USelect
          v-model="recipientStatus"
          :items="statusItems"
          value-key="value"
          class="w-44"
        />
        <USelect
          v-model="recipientReason"
          :items="reasonItems"
          value-key="value"
          class="w-56"
        />
        <UInput
          v-model="recipientQuery"
          class="w-56"
          :placeholder="t('pages.campaigns.recipientSearch')"
        />
      </div>
      <p
        v-if="!recipientsPending && recipients.length === 0"
        class="text-sm text-dimmed"
      >
        {{ t('pages.campaigns.recipientEmpty') }}
      </p>
      <UTable
        v-else
        :data="recipients"
        :columns="recipientColumns"
      />
      <div class="mt-4 flex justify-end gap-2">
        <UButton
          variant="outline"
          color="neutral"
          :label="t('pages.campaigns.previous')"
          :disabled="recipientPage <= 1"
          @click="recipientPage -= 1; loadRecipients()"
        />
        <UButton
          variant="outline"
          color="neutral"
          :label="t('pages.campaigns.next')"
          :disabled="recipientPage >= recipientLastPage"
          @click="recipientPage += 1; loadRecipients()"
        />
      </div>
    </div>

    <div
      v-else
      class="mt-6"
    >
      <MarketingCampaignActivity
        :campaign="campaign"
        :template-label="templateLabel"
      />
    </div>
  </UContainer>
</template>
