<script setup lang="ts">
import type { ApiActivity } from '~/types/activity'
import type { Campaign } from '~/types/campaign'

const props = defineProps<{
  campaign: Campaign
  templateLabel: string | null
}>()

const { t, te, locale } = useI18n()
const { formatDateTime } = useOrgDateFormat()
const { formatActivityMessage } = useActivityMessage()

const {
  activities,
  pending,
  error,
  refresh,
  page,
  lastPage,
  canGoPrev,
  canGoNext,
  goToPrevPage,
  goToNextPage
} = useActivityList({
  subjectType: 'campaign',
  subjectId: computed(() => props.campaign.id)
})

const STAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/

type ChipColor = 'neutral' | 'warning' | 'success' | 'error' | 'primary'

interface Chip {
  label: string
  color: ChipColor
}

interface EventVisual {
  icon: string
  class: string
}

const visuals: Record<string, EventVisual> = {
  'campaign.scheduled': { icon: 'i-lucide-clock', class: 'bg-warning text-white' },
  'campaign.submitted': { icon: 'i-lucide-clipboard-list', class: 'bg-inverted text-inverted' },
  'campaign.created': { icon: 'i-lucide-plus', class: 'bg-elevated text-dimmed ring-1 ring-default' },
  'campaign.approved': { icon: 'i-lucide-check', class: 'bg-success text-white' },
  'campaign.rejected': { icon: 'i-lucide-x', class: 'bg-error text-white' },
  'campaign.paused': { icon: 'i-lucide-pause', class: 'bg-warning text-white' },
  'campaign.resumed': { icon: 'i-lucide-play', class: 'bg-primary text-white' },
  'campaign.cancelled': { icon: 'i-lucide-ban', class: 'bg-error text-white' },
  'campaign.completed': { icon: 'i-lucide-circle-check', class: 'bg-success text-white' },
  'campaign.announcement_sent': { icon: 'i-lucide-megaphone', class: 'bg-primary text-white' }
}

const primarySend = computed(() => props.campaign.sends.find(send => send.channel === 'email')
  ?? props.campaign.sends[0]
  ?? null)

const showUpNext = computed(() => props.campaign.status === 'scheduled')

const upNextWhen = computed(() => clockLabel(primarySend.value?.scheduled_at))

const scheduledLabel = computed(() => clockLabel(primarySend.value?.scheduled_at))

const sendsLabel = computed(() => {
  const completed = primarySend.value?.completed_at
  if (!completed) {
    return t('common.emptyValue')
  }
  return formatDateTime(completed)
})

const ownerLabel = computed(() => props.campaign.creator?.name || t('common.emptyValue'))

const dayGroups = computed(() => {
  const buckets = new Map<string, Array<ApiActivity>>()
  const order: Array<string> = []

  for (const activity of activities.value) {
    const key = stamp(activity.created_at)?.key ?? 'unknown'
    if (!buckets.has(key)) {
      buckets.set(key, [])
      order.push(key)
    }
    buckets.get(key)?.push(activity)
  }

  return order.map(key => ({
    key,
    label: dayLabel(key),
    items: buckets.get(key) ?? []
  }))
})

function stamp(value: string | null) {
  if (!value) {
    return null
  }
  const match = STAMP.exec(value.trim())
  if (!match) {
    return null
  }
  return {
    key: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`
  }
}

function dayLabel(key: string) {
  if (key === 'unknown') {
    return t('common.emptyValue')
  }
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  const parts = new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? ''
  const formatted = `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`
  const now = new Date()
  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')
  if (key === todayKey) {
    return t('pages.campaigns.activity.today', { date: formatted })
  }
  return formatted
}

function eventTime(activity: ApiActivity) {
  return stamp(activity.created_at)?.time ?? formatDateTime(activity.created_at)
}

function clockLabel(value: string | null | undefined) {
  if (!value) {
    return t('common.emptyValue')
  }
  if (value === 'now') {
    return t('pages.campaigns.now')
  }
  return formatDateTime(value)
}

function statusLabel(key: string) {
  return t(`pages.campaigns.statuses.${key}`)
}

function chips(description: string): Array<Chip> {
  const submitted = t('pages.campaigns.activity.submitted')
  switch (description) {
    case 'campaign.scheduled':
      return [
        { label: submitted, color: 'neutral' },
        { label: statusLabel('scheduled'), color: 'warning' }
      ]
    case 'campaign.submitted':
      return [
        { label: statusLabel('draft'), color: 'neutral' },
        { label: submitted, color: 'neutral' }
      ]
    case 'campaign.approved':
      return [
        { label: statusLabel('pending_approval'), color: 'neutral' },
        { label: t('pages.campaigns.activity.approved'), color: 'success' }
      ]
    case 'campaign.rejected':
      return [
        { label: statusLabel('pending_approval'), color: 'neutral' },
        { label: statusLabel('draft'), color: 'neutral' }
      ]
    case 'campaign.paused':
      return [
        { label: statusLabel('sending'), color: 'primary' },
        { label: statusLabel('paused'), color: 'warning' }
      ]
    case 'campaign.resumed':
      return [
        { label: statusLabel('paused'), color: 'warning' },
        { label: statusLabel('sending'), color: 'primary' }
      ]
    case 'campaign.cancelled':
      return [{ label: statusLabel('cancelled'), color: 'error' }]
    case 'campaign.completed':
      return [
        { label: statusLabel('sending'), color: 'primary' },
        { label: statusLabel('sent'), color: 'success' }
      ]
    default:
      return []
  }
}

function visual(description: string): EventVisual {
  return visuals[description] ?? { icon: 'i-lucide-history', class: 'bg-elevated text-dimmed ring-1 ring-default' }
}

function channelLabel(activity: ApiActivity) {
  const key = `activity.channels.${activity.log_name}`
  return te(key) ? t(key) : activity.log_name
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('')
}
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div>
      <div
        v-if="pending && activities.length === 0"
        class="flex min-h-20 items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-dimmed"
        />
      </div>
      <div
        v-else-if="error"
        class="rounded-lg bg-error/5 p-3"
      >
        <p class="text-sm text-error">
          {{ t('activity.loadError') }}
        </p>
        <UButton
          class="mt-2"
          size="sm"
          variant="ghost"
          :label="t('activity.retry')"
          @click="refresh()"
        />
      </div>
      <template v-else>
        <section v-if="showUpNext">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ t('pages.campaigns.activity.upNext') }}
          </p>
          <div class="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-default px-4 py-3">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-full text-dimmed ring-1 ring-default">
              <UIcon
                name="i-lucide-send"
                class="size-4"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-highlighted">
                {{ t('pages.campaigns.activity.sendingStarts') }}
              </p>
              <p class="text-sm text-dimmed">
                {{ t('pages.campaigns.activity.sendingStartsHint') }}
              </p>
            </div>
            <p class="shrink-0 text-sm text-dimmed">
              {{ upNextWhen }}
            </p>
          </div>
        </section>

        <p
          v-if="activities.length === 0"
          class="py-8 text-center text-sm text-dimmed"
        >
          {{ t('activity.empty') }}
        </p>

        <section
          v-for="group in dayGroups"
          :key="group.key"
          class="mt-8"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            {{ group.label }}
          </p>
          <ol class="mt-4">
            <li
              v-for="(activity, index) in group.items"
              :key="activity.id"
              class="flex gap-3"
            >
              <div class="flex w-8 shrink-0 flex-col items-center">
                <div
                  class="flex size-8 items-center justify-center rounded-full"
                  :class="visual(activity.description).class"
                >
                  <UIcon
                    :name="visual(activity.description).icon"
                    class="size-4"
                  />
                </div>
                <div
                  v-if="index < group.items.length - 1"
                  class="my-1 w-px flex-1 bg-(--ui-text-dimmed)"
                />
              </div>
              <div class="mb-4 min-w-0 flex-1 rounded-xl bg-elevated p-4 shadow-sm">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="text-sm font-semibold text-highlighted">
                    {{ formatActivityMessage(activity) }}
                  </p>
                  <p class="shrink-0 text-sm tabular-nums text-dimmed">
                    {{ eventTime(activity) }}
                  </p>
                </div>
                <p
                  v-if="activity.description === 'campaign.created' && templateLabel"
                  class="mt-2 flex flex-wrap items-center gap-2 text-sm text-dimmed"
                >
                  {{ t('pages.campaigns.activity.fromTemplate') }}
                  <UBadge
                    :label="templateLabel"
                    color="neutral"
                    variant="subtle"
                  />
                </p>
                <div
                  v-if="chips(activity.description).length"
                  class="mt-2 flex flex-wrap items-center gap-1.5"
                >
                  <template
                    v-for="(chip, chipIndex) in chips(activity.description)"
                    :key="`${activity.id}-${chip.label}`"
                  >
                    <UIcon
                      v-if="chipIndex > 0"
                      name="i-lucide-arrow-right"
                      class="size-3 text-dimmed"
                    />
                    <UBadge
                      :label="chip.label"
                      :color="chip.color"
                      variant="subtle"
                      size="sm"
                    />
                  </template>
                </div>
                <div
                  v-if="activity.causer?.name"
                  class="mt-3 flex flex-wrap items-center gap-2 border-t border-default pt-3"
                >
                  <UAvatar
                    :text="initials(activity.causer.name)"
                    size="2xs"
                    class="bg-inverted text-inverted"
                  />
                  <span class="text-sm text-highlighted">
                    {{ activity.causer.name }}
                  </span>
                  <UBadge
                    :label="channelLabel(activity)"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </div>
            </li>
          </ol>
        </section>

        <div
          v-if="lastPage > 1"
          class="mt-2 flex justify-end gap-2"
        >
          <UButton
            variant="outline"
            color="neutral"
            :label="t('pages.campaigns.previous')"
            :disabled="!canGoPrev"
            @click="goToPrevPage()"
          />
          <span class="self-center text-xs text-dimmed">
            {{ page }} / {{ lastPage }}
          </span>
          <UButton
            variant="outline"
            color="neutral"
            :label="t('pages.campaigns.next')"
            :disabled="!canGoNext"
            @click="goToNextPage()"
          />
        </div>
      </template>
    </div>

    <aside class="rounded-xl bg-elevated p-5 shadow-sm lg:sticky lg:top-6">
      <h2 class="text-base font-semibold text-highlighted">
        {{ t('pages.campaigns.activity.detailsTitle') }}
      </h2>
      <dl class="mt-4 flex flex-col gap-3 text-sm">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.id') }}
          </dt>
          <dd class="font-medium text-highlighted">
            #{{ campaign.id }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.template') }}
          </dt>
          <dd class="text-end font-medium text-primary">
            {{ templateLabel || t('common.emptyValue') }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.category') }}
          </dt>
          <dd class="text-end font-medium text-highlighted">
            {{ t(`pages.campaigns.types.${campaign.type}`) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.owner') }}
          </dt>
          <dd class="text-end font-medium text-highlighted">
            {{ ownerLabel }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.created') }}
          </dt>
          <dd class="text-end font-medium text-highlighted">
            {{ formatDateTime(campaign.created_at) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.scheduled') }}
          </dt>
          <dd class="text-end font-medium text-highlighted">
            {{ scheduledLabel }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-dimmed">
            {{ t('pages.campaigns.activity.sends') }}
          </dt>
          <dd class="text-end font-medium text-primary">
            {{ sendsLabel }}
          </dd>
        </div>
      </dl>
      <p class="mt-5 text-xs leading-5 text-dimmed">
        {{ t('pages.campaigns.activity.footnote') }}
      </p>
    </aside>
  </div>
</template>
