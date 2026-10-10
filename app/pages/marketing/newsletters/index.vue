<script setup lang="ts">
import type { NewsletterIssue, NewsletterList } from '~/types/newsletter'

const SCHEDULED = ['scheduled', 'sending', 'pending_approval']

const { t, locale } = useI18n()
const { get } = useApi()
const { formatDateTime } = useOrgDateFormat()

const pending = ref(true)
const error = ref(false)
const lists = ref<Array<NewsletterList>>([])
const issuesByList = ref<Record<number, Array<NewsletterIssue>>>({})

const cards = computed(() => lists.value.map(list => ({
  list,
  label: listLabel(list),
  last: lastIssue(issuesByList.value[list.id] ?? []),
  next: nextScheduled(issuesByList.value[list.id] ?? [])
})))

onMounted(() => {
  void load()
})

function listLabel(list: NewsletterList) {
  return list.labels[locale.value] || list.labels.en || list.key
}

function lastIssue(issues: Array<NewsletterIssue>) {
  return issues.find(issue => issue.newsletter_issue_number !== null) ?? issues[0] ?? null
}

function nextScheduled(issues: Array<NewsletterIssue>) {
  return issues
    .filter(issue => SCHEDULED.includes(issue.status) && issue.scheduled_at)
    .slice()
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))[0] ?? null
}

function when(value: string | null) {
  return formatDateTime(value, { empty: t('common.emptyValue') })
}

async function load() {
  pending.value = true
  error.value = false

  try {
    const response = await get<Array<NewsletterList>>('/api/subscription-lists')
    const newsletterLists = response.data.filter(list => list.kind === 'newsletter')
    const issues = await Promise.all(newsletterLists.map(async (list) => {
      const issueResponse = await get<Array<NewsletterIssue>>(`/api/subscription-lists/${list.id}/newsletters`)
      return [list.id, issueResponse.data] as const
    }))

    lists.value = newsletterLists
    issuesByList.value = Object.fromEntries(issues)
  } catch {
    error.value = true
    lists.value = []
    issuesByList.value = {}
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-xl font-semibold text-highlighted">
        {{ t('pages.newsletters.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-dimmed">
        {{ t('pages.newsletters.subtitle') }}
      </p>
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

    <p
      v-else-if="cards.length === 0"
      class="text-sm text-dimmed"
    >
      {{ t('pages.newsletters.empty') }}
    </p>

    <div
      v-else
      class="grid gap-4 md:grid-cols-2"
    >
      <UCard
        v-for="card in cards"
        :key="card.list.id"
      >
        <NuxtLink
          :to="`/marketing/newsletters/${card.list.id}`"
          class="text-base font-medium text-highlighted hover:underline"
        >
          {{ card.label }}
        </NuxtLink>

        <dl class="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <dt class="text-dimmed">
              {{ t('pages.newsletters.subscribers') }}
            </dt>
            <dd class="mt-1 flex flex-wrap gap-2">
              <span
                v-for="channel in card.list.channels"
                :key="channel"
                class="rounded-md bg-elevated px-2 py-1"
              >
                {{ t(`forms.communications.channels.${channel}`) }}
                {{ card.list.member_counts[channel] ?? 0 }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              {{ t('pages.newsletters.lastIssue') }}
            </dt>
            <dd>
              <template v-if="card.last">
                {{ card.last.newsletter_issue_number !== null
                  ? t('pages.newsletters.issueNumber', { number: card.last.newsletter_issue_number })
                  : card.last.name }}
                · {{ t(`pages.newsletters.statuses.${card.last.status}`) }}
              </template>
              <template v-else>
                {{ t('pages.newsletters.noIssue') }}
              </template>
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              {{ t('pages.newsletters.nextScheduled') }}
            </dt>
            <dd>
              <template v-if="card.next">
                {{ card.next.name }} · {{ when(card.next.scheduled_at) }}
              </template>
              <template v-else>
                {{ t('pages.newsletters.noneScheduled') }}
              </template>
            </dd>
          </div>
        </dl>
      </UCard>
    </div>
  </UContainer>
</template>
