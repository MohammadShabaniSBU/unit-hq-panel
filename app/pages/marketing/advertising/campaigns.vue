<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { AdCampaign } from '~/types/advertising'
import type { ReportFilters } from '~/types/report'
import { Permission } from '~/types/permissions'
import { formatMoney } from '~/composables/useMoney'

interface UnitOption {
  value: number
  label: string
}

interface CampaignMetric {
  paid_leads: number
  paid_move_ins: number
  costs: Array<{ currency: string, value: string | null }>
}

const { t, locale } = useI18n()
const route = useRoute()
const toast = useToast()
const { can } = usePermissions()
const { get } = useApi()
const { from, to } = usePaidAcquisitionReport()
const { campaigns, meta, pending, error, fetchPage, mapCampaign, mapSelected } = useAdCampaignList()
const { result, fetchReport } = useReport('paid-acquisition')
const { items: siteItems } = useOptions('/api/sites/options')
const siteContext = useSiteContextStore()
const {
  page,
  perPage,
  goToPrevPage,
  goToNextPage,
  goToPage: setPage
} = useListPagination()

const canManage = computed(() => can(Permission.AdvertisingManage))
const provider = ref('all')
const status = ref('all')
const mapped = ref(route.query.mapped === 'true' || route.query.mapped === 'false' ? route.query.mapped : 'all')
const siteId = ref<number | undefined>(undefined)
const selected = ref<Array<number>>([])
const bulkSiteId = ref<number | undefined>(undefined)
const bulkSaving = ref(false)

const drawerOpen = ref(false)
const drawerCampaign = ref<AdCampaign | null>(null)
const drawerSiteId = ref<number | undefined>(undefined)
const drawerUnitClassId = ref<number | undefined>(undefined)
const drawerHint = ref('')
const drawerSaving = ref(false)
const unitOptions = ref<Array<UnitOption>>([])
const unitLabels = ref<Map<number, string>>(new Map())

const providerOptions = computed(() => [
  { label: t('pages.advertising.filters.allPlatforms'), value: 'all' },
  { label: t('pages.advertising.providers.google_ads'), value: 'google_ads' },
  { label: t('pages.advertising.providers.meta'), value: 'meta' }
])

const statusOptions = computed(() => [
  { label: t('pages.advertising.filters.allStatuses'), value: 'all' },
  { label: t('pages.advertising.campaignStatus.enabled'), value: 'enabled' },
  { label: t('pages.advertising.campaignStatus.paused'), value: 'paused' },
  { label: t('pages.advertising.campaignStatus.removed'), value: 'removed' }
])

const mappedOptions = computed(() => [
  { label: t('pages.advertising.filters.allMapping'), value: 'all' },
  { label: t('pages.advertising.filters.mapped'), value: 'true' },
  { label: t('pages.advertising.filters.unmapped'), value: 'false' }
])

const siteOptions = computed(() => siteItems.value.map(site => ({
  label: site.label,
  value: Number(site.value)
})))

const siteName = computed(() => {
  const names = new Map<number, string>()
  for (const site of siteOptions.value) {
    names.set(site.value, site.label)
  }
  return names
})

const metrics = computed(() => {
  const rows = result.value?.meta && Array.isArray(result.value.meta.campaigns)
    ? result.value.meta.campaigns as Array<{
      campaign_id: number
      currency: string
      paid_leads: number
      paid_move_ins: number
      cost_per_move_in: string | null
    }>
    : []
  const byId = new Map<number, CampaignMetric>()
  for (const row of rows) {
    const current = byId.get(row.campaign_id) ?? {
      paid_leads: row.paid_leads,
      paid_move_ins: row.paid_move_ins,
      costs: []
    }
    current.costs.push({ currency: row.currency, value: row.cost_per_move_in })
    byId.set(row.campaign_id, current)
  }
  return byId
})

function dash() {
  return t('common.emptyValue')
}

function siteLabel(id: number | null) {
  if (id == null) {
    return dash()
  }
  return siteName.value.get(id) ?? dash()
}

function spendLabel(row: AdCampaign) {
  if (!row.spend || row.spend.length === 0) {
    return dash()
  }
  return row.spend
    .map(entry => formatMoney(entry.cost, entry.currency, locale.value))
    .join('\n')
}

function metricOf(row: AdCampaign): CampaignMetric | null {
  return metrics.value.get(row.id) ?? null
}

function costLabel(row: AdCampaign) {
  const metric = metricOf(row)
  if (!metric || metric.costs.length === 0) {
    return dash()
  }
  return metric.costs
    .map(entry => entry.value == null ? dash() : formatMoney(entry.value, entry.currency, locale.value))
    .join('\n')
}

function errorText(e: unknown): string {
  const err = e as { data?: { message?: string, errors?: Record<string, Array<string>> } }
  const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : undefined
  return first || err.data?.message || t('pages.advertising.saveError')
}

async function loadUnits(site: number | undefined) {
  unitOptions.value = []
  if (site == null) {
    return
  }
  try {
    const response = await get<Array<{ value: number, label: string }>>('/api/unit-classes/options', {
      site_id: site
    })
    unitOptions.value = response.data.map(option => ({
      value: Number(option.value),
      label: option.label
    }))
  } catch {
    unitOptions.value = []
  }
}

function onGoToPage(target: number) {
  setPage(target, meta.value.last_page)
}

async function load() {
  await fetchPage({
    page: page.value,
    perPage: perPage.value,
    provider: provider.value === 'all' ? undefined : provider.value,
    status: status.value === 'all' ? undefined : status.value,
    mapped: mapped.value === 'true' || mapped.value === 'false' ? mapped.value : undefined,
    siteId: siteId.value,
    from: from.value,
    to: to.value
  })
  const filters: ReportFilters = {}
  if (from.value) {
    filters.from = from.value
  }
  if (to.value) {
    filters.to = to.value
  }
  if (provider.value !== 'all') {
    filters.platform = provider.value
  }
  if (siteId.value != null) {
    filters.site_ids = [siteId.value]
  } else if (typeof siteContext.selectedSiteId === 'number') {
    filters.site_ids = [siteContext.selectedSiteId]
  }
  await fetchReport(filters)
}

function toggleSelected(id: number, checked: boolean) {
  selected.value = checked
    ? [...selected.value, id]
    : selected.value.filter(value => value !== id)
}

function openMap(row: AdCampaign) {
  drawerCampaign.value = row
  drawerSiteId.value = row.site_id ?? undefined
  drawerUnitClassId.value = row.unit_class_id ?? undefined
  drawerHint.value = row.utm_campaign_hint ?? ''
  drawerOpen.value = true
  void loadUnits(drawerSiteId.value)
}

watch(drawerSiteId, (site) => {
  void loadUnits(site)
})

async function onMap() {
  const row = drawerCampaign.value
  if (!row || drawerSiteId.value == null) {
    return
  }
  drawerSaving.value = true
  try {
    await mapCampaign(row.id, {
      site_id: drawerSiteId.value,
      unit_class_id: drawerUnitClassId.value ?? null,
      utm_campaign_hint: drawerHint.value.trim() === '' ? null : drawerHint.value.trim()
    })
    drawerOpen.value = false
    toast.add({ title: t('pages.advertising.mapped'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  } finally {
    drawerSaving.value = false
  }
}

async function onAccept(row: AdCampaign) {
  if (row.suggested_site_id == null) {
    return
  }
  try {
    await mapCampaign(row.id, {
      site_id: row.suggested_site_id,
      unit_class_id: row.unit_class_id,
      utm_campaign_hint: row.utm_campaign_hint
    })
    toast.add({ title: t('pages.advertising.mapped'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  }
}

async function onBulk() {
  if (selected.value.length === 0 || bulkSiteId.value == null) {
    return
  }
  bulkSaving.value = true
  try {
    await mapSelected(selected.value, bulkSiteId.value)
    selected.value = []
    toast.add({ title: t('pages.advertising.mapped'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: errorText(e), color: 'error' })
  } finally {
    bulkSaving.value = false
  }
}

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const columns = computed<Array<TableColumn<AdCampaign>>>(() => [
  {
    accessorKey: 'name',
    header: t('pages.advertising.columns.name'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      canManage.value
        ? h(UCheckbox, {
            'modelValue': selected.value.includes(row.original.id),
            'onUpdate:modelValue': (checked: boolean | 'indeterminate') => toggleSelected(row.original.id, checked === true)
          })
        : null,
      h('span', { class: 'font-medium text-highlighted' }, row.original.name)
    ])
  },
  {
    accessorKey: 'provider',
    header: t('pages.advertising.columns.platform'),
    cell: ({ row }) => row.original.provider
      ? t(`pages.advertising.providers.${row.original.provider}`)
      : dash()
  },
  {
    accessorKey: 'status',
    header: t('pages.advertising.columns.status'),
    cell: ({ row }) => t(`pages.advertising.campaignStatus.${row.original.status}`)
  },
  {
    id: 'site',
    header: t('pages.advertising.columns.site'),
    cell: ({ row }) => siteLabel(row.original.site_id)
  },
  {
    id: 'unit',
    header: t('pages.advertising.columns.unitClass'),
    cell: ({ row }) => row.original.unit_class_id == null
      ? dash()
      : (unitLabels.value.get(row.original.unit_class_id) ?? dash())
  },
  {
    id: 'spend',
    header: t('pages.advertising.columns.spend'),
    cell: ({ row }) => h('span', { class: 'whitespace-pre-line tabular-nums' }, spendLabel(row.original))
  },
  {
    id: 'leads',
    header: t('pages.advertising.columns.paidLeads'),
    cell: ({ row }) => String(metricOf(row.original)?.paid_leads ?? dash())
  },
  {
    id: 'moveIns',
    header: t('pages.advertising.columns.paidMoveIns'),
    cell: ({ row }) => String(metricOf(row.original)?.paid_move_ins ?? dash())
  },
  {
    id: 'cost',
    header: t('pages.advertising.columns.costPerMoveIn'),
    cell: ({ row }) => h('span', { class: 'whitespace-pre-line tabular-nums' }, costLabel(row.original))
  },
  {
    id: 'mapping',
    header: t('pages.advertising.columns.mapping'),
    cell: ({ row }) => {
      const chips: Array<ReturnType<typeof h>> = []
      if (row.original.site_id == null && row.original.suggested_site_id == null) {
        chips.push(h(UBadge, {
          color: 'warning',
          variant: 'subtle',
          label: t('pages.advertising.unmapped')
        }))
      } else if (row.original.site_id == null && row.original.suggested_site_id != null && canManage.value) {
        chips.push(h(UButton, {
          size: 'xs',
          color: 'warning',
          variant: 'subtle',
          label: t('pages.advertising.suggested', { site: siteLabel(row.original.suggested_site_id) }),
          onClick: () => onAccept(row.original)
        }))
      } else if (row.original.site_id == null) {
        chips.push(h(UBadge, {
          color: 'warning',
          variant: 'subtle',
          label: t('pages.advertising.suggested', { site: siteLabel(row.original.suggested_site_id) })
        }))
      }
      if (canManage.value) {
        chips.push(h(UButton, {
          size: 'xs',
          variant: 'ghost',
          color: 'neutral',
          label: t('pages.advertising.map'),
          onClick: () => openMap(row.original)
        }))
      }
      return h('div', { class: 'flex flex-wrap items-center gap-2' }, chips)
    }
  }
])

watch([provider, status, mapped, siteId], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }
  void load()
})

watch([page, perPage, from, to], () => {
  void load()
})

onMounted(async () => {
  try {
    const response = await get<Array<{ value: number, label: string }>>('/api/unit-classes/options')
    const labels = new Map<number, string>()
    for (const option of response.data) {
      labels.set(Number(option.value), option.label)
    }
    unitLabels.value = labels
  } catch {
    unitLabels.value = new Map()
  }
  await load()
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ t('nav.ad_campaigns') }}
      </h1>
      <p class="mt-1 text-sm text-dimmed">
        {{ t('pages.advertising.campaignsSubtitle') }}
      </p>
    </div>

    <div class="mb-4 flex flex-wrap items-end gap-3">
      <UFormField :label="t('pages.advertising.filters.platform')">
        <USelect
          v-model="provider"
          :items="providerOptions"
          value-key="value"
          label-key="label"
          class="w-40"
        />
      </UFormField>
      <UFormField :label="t('pages.advertising.filters.status')">
        <USelect
          v-model="status"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          class="w-40"
        />
      </UFormField>
      <UFormField :label="t('pages.advertising.filters.mapping')">
        <USelect
          v-model="mapped"
          :items="mappedOptions"
          value-key="value"
          label-key="label"
          class="w-40"
        />
      </UFormField>
      <UFormField :label="t('pages.advertising.filters.site')">
        <USelect
          v-model="siteId"
          :items="siteOptions"
          value-key="value"
          label-key="label"
          class="w-48"
        />
      </UFormField>
    </div>

    <div
      v-if="canManage"
      class="mb-4 flex flex-wrap items-end gap-3"
    >
      <UFormField :label="t('pages.advertising.mapSelected')">
        <USelect
          v-model="bulkSiteId"
          :items="siteOptions"
          value-key="value"
          label-key="label"
          class="w-48"
        />
      </UFormField>
      <UButton
        :label="t('pages.advertising.mapSelected')"
        :disabled="selected.length === 0 || bulkSiteId == null"
        :loading="bulkSaving"
        @click="onBulk"
      />
    </div>

    <p
      v-if="error"
      class="text-sm text-error"
    >
      {{ t('pages.advertising.loadError') }}
    </p>

    <UTable
      :data="campaigns"
      :columns="columns"
      :loading="pending"
      class="w-full"
    />

    <FacilityListPagination
      v-if="meta.total > 0"
      v-model:per-page="perPage"
      :page="page"
      :total-pages="meta.last_page"
      :showing-count="campaigns.length"
      :total-count="meta.total"
      :can-go-prev="page > 1"
      :can-go-next="page < meta.last_page"
      @prev="goToPrevPage"
      @next="goToNextPage(meta.last_page)"
      @go-to-page="onGoToPage"
    />

    <USlideover
      v-model:open="drawerOpen"
      :title="t('pages.advertising.map')"
    >
      <template #body>
        <form
          class="flex flex-col gap-3"
          @submit.prevent="onMap"
        >
          <UFormField
            :label="t('pages.advertising.filters.site')"
            required
          >
            <USelect
              v-model="drawerSiteId"
              :items="siteOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('pages.advertising.columns.unitClass')">
            <USelect
              v-model="drawerUnitClassId"
              :items="unitOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('pages.advertising.utmHint')"
            :hint="t('pages.advertising.utmHintHelp')"
          >
            <UInput
              v-model="drawerHint"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            :loading="drawerSaving"
            :disabled="drawerSiteId == null"
            :label="t('pages.advertising.save')"
          />
        </form>
      </template>
    </USlideover>
  </UContainer>
</template>
