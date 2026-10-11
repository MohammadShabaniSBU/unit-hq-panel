<script setup lang="ts">
import PaidAcquisitionReport from '~/components/insights/native/PaidAcquisitionReport.vue'
import type { AdvertisingSetup } from '~/types/advertising'
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { get } = useApi()
const { can } = usePermissions()
const { periodQuery } = usePaidAcquisitionReport()

const setup = ref<AdvertisingSetup | null>(null)
const pending = ref(true)
const error = ref(false)

const empty = computed(() => setup.value != null && !setup.value.accounts_connected)

interface CheckItem {
  key: string
  done: boolean
  to: string | { path: string, query: Record<string, string> } | null
}

const checklist = computed<Array<CheckItem>>(() => {
  if (!setup.value) {
    return []
  }
  const period = periodQuery()
  return [
    {
      key: 'accounts_connected',
      done: setup.value.accounts_connected,
      to: can(Permission.AdvertisingConnect) ? '/settings/advertising' : null
    },
    {
      key: 'tag_seen',
      done: setup.value.tag_seen,
      to: can(Permission.AdvertisingConnect) ? '/settings/advertising' : null
    },
    {
      key: 'enquiry_form',
      done: setup.value.enquiry_form,
      to: can(Permission.MarketingView) ? '/marketing/audience/forms' : null
    },
    {
      key: 'mappings_set',
      done: setup.value.mappings_set,
      to: '/marketing/advertising/conversions'
    },
    {
      key: 'campaigns_mapped',
      done: setup.value.campaigns_mapped,
      to: { path: '/marketing/advertising/campaigns', query: { ...period, mapped: 'false' } }
    }
  ]
})

const checklistOpen = computed(() => checklist.value.some(item => !item.done))

onMounted(async () => {
  try {
    const response = await get<AdvertisingSetup>('/api/advertising/setup')
    setup.value = response.data
  } catch {
    error.value = true
  } finally {
    pending.value = false
  }
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ t('nav.advertisingOverview') }}
        </h1>
        <p class="mt-1 text-sm text-dimmed">
          {{ t('pages.advertising.overviewSubtitle') }}
        </p>
      </div>
      <UButton
        v-if="!empty"
        variant="outline"
        color="neutral"
        :to="{ path: '/insights/paid-acquisition', query: periodQuery() }"
        :label="t('pages.advertising.viewInInsights')"
      />
    </div>

    <p
      v-if="pending"
      class="text-sm text-dimmed"
    >
      {{ t('pages.advertising.loading') }}
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ t('pages.advertising.loadError') }}
    </p>

    <template v-else-if="empty">
      <UCard>
        <p class="text-sm text-highlighted">
          {{ t('pages.advertising.emptyTitle') }}
        </p>
        <p class="mt-1 text-sm text-dimmed">
          {{ t('pages.advertising.emptyBody') }}
        </p>
        <UButton
          v-if="can(Permission.AdvertisingConnect)"
          class="mt-4"
          to="/settings/advertising"
          :label="t('pages.advertising.emptyCta')"
        />
      </UCard>
    </template>

    <UCard
      v-if="!pending && !error && checklistOpen"
      class="mt-6"
    >
      <h2 class="text-sm font-medium text-highlighted">
        {{ t('pages.advertising.checklistTitle') }}
      </h2>
      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="item in checklist"
          :key="item.key"
          class="flex items-center justify-between gap-3 text-sm"
        >
          <span :class="item.done ? 'text-dimmed line-through' : 'text-highlighted'">
            {{ t(`pages.advertising.checklist.${item.key}`) }}
          </span>
          <UButton
            v-if="!item.done && item.to"
            size="xs"
            variant="ghost"
            color="neutral"
            :to="item.to"
            :label="t('pages.advertising.checklistFix')"
          />
        </li>
      </ul>
    </UCard>

    <PaidAcquisitionReport
      v-if="!pending && !error && !empty"
      class="mt-6"
      embedded
    />
  </UContainer>
</template>
