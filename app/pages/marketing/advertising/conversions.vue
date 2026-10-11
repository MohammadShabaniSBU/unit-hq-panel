<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type {
  AdAccountSummary,
  AdConversionDelivery,
  AdConversionMappingRow,
  AdConversionTarget,
  AdvertisingSetup,
  ConversionEventKey
} from '~/types/advertising'
import { Permission } from '~/types/permissions'

const EVENT_KEYS: Array<ConversionEventKey> = ['lead', 'reservation', 'move_in']
const SKIP_REASONS = [
  'no_consent',
  'no_identifier',
  'click_too_old',
  'mapping_inactive',
  'account_inactive',
  'event_too_old'
] as const

const { t } = useI18n()
const { get } = useApi()
const { can } = usePermissions()
const { formatDateTime } = useOrgDateFormat()
const { from, to } = usePaidAcquisitionReport()
const { load, save, targets, sendTest } = useAdConversionMappings()
const {
  rows,
  summary,
  meta,
  pending,
  error,
  fetchPage,
  retry
} = useAdConversionDeliveryList()
const {
  page,
  perPage,
  goToPrevPage,
  goToNextPage,
  goToPage: setPage
} = useListPagination()

const canManage = computed(() => can(Permission.AdvertisingManage))
const tab = ref<'setup' | 'delivery'>('setup')
const accounts = ref<Array<AdAccountSummary>>([])
const mappings = ref<Record<number, Array<AdConversionMappingRow>>>({})
const targetOptions = ref<Record<number, Array<AdConversionTarget>>>({})
const testCodes = ref<Record<number, string>>({})
const testResults = ref<Record<string, string>>({})
const savingId = ref<number | null>(null)
const setupError = ref(false)

const filterAccount = ref<number | undefined>(undefined)
const filterStatus = ref('all')
const filterReason = ref('all')
const filterEvent = ref('all')

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

const accountOptions = computed(() => accounts.value.map(account => ({
  label: account.name,
  value: account.id
})))

const statusOptions = computed(() => [
  { label: t('pages.advertising.filters.allStatuses'), value: 'all' },
  ...(['pending', 'claimed', 'sent', 'skipped', 'failed'] as const).map(value => ({
    label: t(`pages.advertising.deliveryStatus.${value}`),
    value
  }))
])

const reasonOptions = computed(() => [
  { label: t('pages.advertising.filters.allReasons'), value: 'all' },
  ...SKIP_REASONS.map(value => ({
    label: t(`pages.advertising.skipReasons.${value}`),
    value
  }))
])

const eventOptions = computed(() => [
  { label: t('pages.advertising.filters.allEvents'), value: 'all' },
  ...EVENT_KEYS.map(value => ({
    label: t(`pages.advertising.events.${value}`),
    value
  }))
])

const valueRuleOptions = computed(() => [
  { label: t('pages.advertising.valueRules.none'), value: 'none' },
  { label: t('pages.advertising.valueRules.first_period_net'), value: 'first_period_net' }
])

function summaryCount(accountId: number, status: string, reason?: string) {
  return summary.value
    .filter(row => row.account_id === accountId
      && row.status === status
      && (reason == null || row.skip_reason === reason))
    .reduce((total, row) => total + row.count, 0)
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : undefined
  return first || err.data?.message || t('pages.advertising.saveError')
}

function rowOf(accountId: number, eventKey: ConversionEventKey): AdConversionMappingRow | undefined {
  return mappings.value[accountId]?.find(row => row.event_key === eventKey)
}

function targetItems(accountId: number) {
  return (targetOptions.value[accountId] ?? []).map(target => ({
    label: target.name,
    value: target.ref
  }))
}

async function loadSetup() {
  setupError.value = false
  try {
    const response = await get<AdvertisingSetup>('/api/advertising/setup')
    accounts.value = response.data.accounts
    await Promise.all(response.data.accounts.map(async (account) => {
      mappings.value[account.id] = await load(account.id)
      if (canManage.value) {
        try {
          targetOptions.value[account.id] = await targets(account.id)
        } catch {
          targetOptions.value[account.id] = []
        }
      }
    }))
  } catch {
    setupError.value = true
  }
}

async function onSave(accountId: number) {
  const rowsForAccount = mappings.value[accountId]
  if (!rowsForAccount) {
    return
  }
  savingId.value = accountId
  try {
    mappings.value[accountId] = await save(accountId, rowsForAccount)
  } catch (e) {
    const message = errorText(e)
    testResults.value[`${accountId}:save`] = message
  } finally {
    savingId.value = null
  }
}

async function onTest(account: AdAccountSummary, eventKey: ConversionEventKey) {
  const key = `${account.id}:${eventKey}`
  try {
    const code = account.provider === 'meta' ? (testCodes.value[account.id] ?? '').trim() : null
    const result = await sendTest(account.id, eventKey, code === '' ? null : code)
    testResults.value[key] = result.ok
      ? t('pages.advertising.testOk')
      : (result.error || t('pages.advertising.testFailed'))
  } catch (e) {
    testResults.value[key] = errorText(e)
  }
}

function onGoToPage(target: number) {
  setPage(target, meta.value.last_page)
}

async function loadDeliveries() {
  await fetchPage({
    page: page.value,
    perPage: perPage.value,
    accountId: filterAccount.value,
    status: filterStatus.value === 'all' ? undefined : filterStatus.value,
    skipReason: filterReason.value === 'all' ? undefined : filterReason.value,
    eventKey: filterEvent.value === 'all' ? undefined : filterEvent.value,
    from: from.value,
    to: to.value
  })
}

async function onRetry(row: AdConversionDelivery) {
  try {
    await retry(row.id)
    await loadDeliveries()
  } catch (e) {
    const message = errorText(e)
    testResults.value[`retry:${row.id}`] = message
  }
}

const columns = computed<Array<TableColumn<AdConversionDelivery>>>(() => [
  {
    id: 'time',
    header: t('pages.advertising.columns.time'),
    cell: ({ row }) => formatDateTime(row.original.event?.occurred_at ?? row.original.processed_at)
  },
  {
    id: 'event',
    header: t('pages.advertising.columns.event'),
    cell: ({ row }) => row.original.event
      ? t(`pages.advertising.events.${row.original.event.event_key}`)
      : t('common.emptyValue')
  },
  {
    id: 'contact',
    header: t('pages.advertising.columns.contact'),
    cell: ({ row }) => {
      const contact = row.original.event?.contact
      if (!contact) {
        return t('common.emptyValue')
      }
      return h(resolveComponent('NuxtLink'), {
        to: `/leasing/contacts/${contact.id}`,
        class: 'text-highlighted hover:underline'
      }, () => contact.name || t('common.emptyValue'))
    }
  },
  {
    id: 'account',
    header: t('pages.advertising.columns.account'),
    cell: ({ row }) => row.original.account?.name ?? t('common.emptyValue')
  },
  {
    id: 'status',
    header: t('pages.advertising.columns.status'),
    cell: ({ row }) => t(`pages.advertising.deliveryStatus.${row.original.status}`)
  },
  {
    id: 'reason',
    header: t('pages.advertising.columns.reason'),
    cell: ({ row }) => {
      if (!row.original.skip_reason) {
        return row.original.error || t('common.emptyValue')
      }
      return h('span', {
        title: t(`pages.advertising.skipHelp.${row.original.skip_reason}`)
      }, t(`pages.advertising.skipReasons.${row.original.skip_reason}`))
    }
  },
  {
    id: 'identifiers',
    header: t('pages.advertising.columns.identifiers'),
    cell: ({ row }) => h('div', { class: 'flex flex-wrap gap-1' }, row.original.identifiers_used.map(name =>
      h(UBadge, { variant: 'subtle', color: 'neutral', label: name })
    ))
  },
  {
    accessorKey: 'attempts',
    header: t('pages.advertising.columns.attempts')
  },
  {
    id: 'retry',
    header: '',
    cell: ({ row }) => {
      if (!canManage.value || row.original.status !== 'failed') {
        return null
      }
      return h(UButton, {
        size: 'xs',
        variant: 'outline',
        color: 'neutral',
        label: t('pages.advertising.retry'),
        onClick: () => onRetry(row.original)
      })
    }
  }
])

watch([page, perPage, filterAccount, filterStatus, filterReason, filterEvent, from, to, tab], () => {
  if (tab.value === 'delivery') {
    void loadDeliveries()
  }
})

onMounted(() => {
  void loadSetup()
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('nav.advertisingConversions') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ t('pages.advertising.conversionsSubtitle') }}
      </p>
    </div>

    <div class="mb-6 flex gap-2">
      <UButton
        :variant="tab === 'setup' ? 'solid' : 'outline'"
        color="neutral"
        :label="t('pages.advertising.tabs.setup')"
        @click="tab = 'setup'"
      />
      <UButton
        :variant="tab === 'delivery' ? 'solid' : 'outline'"
        color="neutral"
        :label="t('pages.advertising.tabs.delivery')"
        @click="tab = 'delivery'"
      />
    </div>

    <div v-if="tab === 'setup'">
      <p
        v-if="setupError"
        class="text-sm text-error"
      >
        {{ t('pages.advertising.loadError') }}
      </p>
      <p
        v-else-if="accounts.length === 0"
        class="text-sm text-dimmed"
      >
        {{ t('pages.advertising.noAccounts') }}
      </p>
      <div
        v-else
        class="flex flex-col gap-4"
      >
        <UCard
          v-for="account in accounts"
          :key="account.id"
        >
          <template #header>
            <h2 class="text-sm font-medium text-highlighted">
              {{ account.name }}
              · {{ t(`pages.advertising.providers.${account.provider}`) }}
            </h2>
          </template>
          <div
            v-if="account.provider === 'meta' && canManage"
            class="mb-4"
          >
            <UFormField :label="t('pages.advertising.testEventCode')">
              <UInput
                v-model="testCodes[account.id]"
                class="max-w-sm"
              />
            </UFormField>
          </div>
          <div
            v-for="eventKey in EVENT_KEYS"
            :key="eventKey"
            class="mb-4 grid gap-3 border-b border-default pb-4 md:grid-cols-4"
          >
            <p class="text-sm font-medium text-highlighted">
              {{ t(`pages.advertising.events.${eventKey}`) }}
            </p>
            <UFormField :label="t('pages.advertising.target')">
              <USelect
                v-if="rowOf(account.id, eventKey)"
                :model-value="rowOf(account.id, eventKey)?.external_ref ?? undefined"
                :items="targetItems(account.id)"
                value-key="value"
                label-key="label"
                class="w-full"
                :disabled="!canManage"
                @update:model-value="(value: string) => {
                  const row = rowOf(account.id, eventKey)
                  if (row) row.external_ref = value
                }"
              />
            </UFormField>
            <UFormField
              v-if="eventKey === 'move_in'"
              :label="t('pages.advertising.valueRule')"
            >
              <USelect
                v-if="rowOf(account.id, eventKey)"
                :model-value="rowOf(account.id, eventKey)?.value_rule"
                :items="valueRuleOptions"
                value-key="value"
                label-key="label"
                class="w-full"
                :disabled="!canManage"
                @update:model-value="(value: string) => {
                  if (value !== 'none' && value !== 'first_period_net') {
                    return
                  }
                  const row = rowOf(account.id, eventKey)
                  if (row) row.value_rule = value
                }"
              />
            </UFormField>
            <div class="flex items-end gap-3">
              <UFormField :label="t('pages.advertising.active')">
                <USwitch
                  v-if="rowOf(account.id, eventKey)"
                  :model-value="rowOf(account.id, eventKey)?.is_active"
                  :disabled="!canManage"
                  @update:model-value="(value: boolean) => {
                    const row = rowOf(account.id, eventKey)
                    if (row) row.is_active = value
                  }"
                />
              </UFormField>
              <UButton
                v-if="canManage"
                size="xs"
                variant="outline"
                color="neutral"
                :label="t('pages.advertising.sendTest')"
                @click="onTest(account, eventKey)"
              />
            </div>
            <p
              v-if="testResults[`${account.id}:${eventKey}`]"
              class="text-sm text-dimmed md:col-span-4"
            >
              {{ testResults[`${account.id}:${eventKey}`] }}
            </p>
          </div>
          <p
            v-if="testResults[`${account.id}:save`]"
            class="mb-2 text-sm text-error"
          >
            {{ testResults[`${account.id}:save`] }}
          </p>
          <UButton
            v-if="canManage"
            :loading="savingId === account.id"
            :label="t('pages.advertising.save')"
            @click="onSave(account.id)"
          />
        </UCard>
      </div>
    </div>

    <div v-else>
      <div class="mb-4 flex flex-wrap items-end gap-3">
        <UFormField :label="t('pages.advertising.filters.account')">
          <USelect
            v-model="filterAccount"
            :items="accountOptions"
            value-key="value"
            label-key="label"
            class="w-48"
          />
        </UFormField>
        <UFormField :label="t('pages.advertising.filters.status')">
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            class="w-40"
          />
        </UFormField>
        <UFormField :label="t('pages.advertising.filters.reason')">
          <USelect
            v-model="filterReason"
            :items="reasonOptions"
            value-key="value"
            label-key="label"
            class="w-48"
          />
        </UFormField>
        <UFormField :label="t('pages.advertising.filters.event')">
          <USelect
            v-model="filterEvent"
            :items="eventOptions"
            value-key="value"
            label-key="label"
            class="w-40"
          />
        </UFormField>
      </div>

      <div
        v-if="summary.length > 0"
        class="mb-4 flex flex-col gap-2"
      >
        <div
          v-for="account in accounts"
          :key="account.id"
          class="text-sm text-dimmed"
        >
          <span class="font-medium text-highlighted">{{ account.name }}</span>
          · {{ t('pages.advertising.deliveryStatus.sent') }} {{ summaryCount(account.id, 'sent') }}
          · {{ t('pages.advertising.deliveryStatus.failed') }} {{ summaryCount(account.id, 'failed') }}
          <span
            v-for="reason in SKIP_REASONS"
            :key="reason"
          >
            <template v-if="summaryCount(account.id, 'skipped', reason) > 0">
              · {{ t(`pages.advertising.skipReasons.${reason}`) }}
              {{ summaryCount(account.id, 'skipped', reason) }}
            </template>
          </span>
        </div>
      </div>

      <p
        v-if="error"
        class="text-sm text-error"
      >
        {{ t('pages.advertising.loadError') }}
      </p>
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
        class="w-full"
      />
      <FacilityListPagination
        v-if="meta.total > 0"
        v-model:per-page="perPage"
        :page="page"
        :total-pages="meta.last_page"
        :showing-count="rows.length"
        :total-count="meta.total"
        :can-go-prev="page > 1"
        :can-go-next="page < meta.last_page"
        @prev="goToPrevPage"
        @next="goToNextPage(meta.last_page)"
        @go-to-page="onGoToPage"
      />
    </div>
  </UContainer>
</template>
