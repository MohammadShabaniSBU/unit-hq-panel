<script setup lang="ts">
import type { InlineFieldValue } from '~/components/InlineField.vue'
import type { ApiSite } from '~/types/facility'

type SiteDetailTab = 'general' | 'floor-maps' | 'integrations' | 'service-areas' | 'voice-bridge'

const route = useRoute()
const { t } = useI18n()
const siteId = computed(() => Number(route.params.id))

const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  () => `settings-site-${siteId.value}`,
  () => get<ApiSite>(`/api/sites/${siteId.value}`),
  { watch: [siteId] }
)

const site = computed(() => data.value?.data ?? null)

const { updateField, updatePayload, updatingField, fieldErrors } = useSiteUpdate(siteId)
const { items: countryItems } = useOptions('/api/countries/options')
const { items: legalEntityItems } = useOptions('/api/legal-entities/options')

const timezoneOptions = (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
  ? Intl.supportedValuesOf('timeZone')
  : ['UTC', 'Europe/Madrid', 'Europe/London', 'America/New_York']
).map(tz => ({ label: tz, value: tz }))

const countryOptions = computed(() =>
  countryItems.value.map((item) => {
    const option = item as { value: number, title?: string, label?: string }
    return {
      value: String(option.value),
      label: option.title ?? option.label ?? String(option.value)
    }
  })
)

const legalEntityOptions = computed(() =>
  legalEntityItems.value.map((item) => {
    const option = item as { value: number, title?: string, label?: string }
    return {
      value: String(option.value),
      label: option.title ?? option.label ?? String(option.value)
    }
  })
)

const enabledTabs = computed(() => {
  const tabs: Array<{ key: SiteDetailTab, label: string, icon: string }> = [
    { key: 'general', label: t('pages.settings.siteTabs.general'), icon: 'i-lucide-info' },
    { key: 'floor-maps', label: t('pages.settings.siteTabs.floorMaps'), icon: 'i-lucide-map' },
    { key: 'integrations', label: t('pages.settings.siteTabs.integrations'), icon: 'i-lucide-plug' },
    { key: 'service-areas', label: t('pages.settings.siteTabs.serviceAreas'), icon: 'i-lucide-map-pinned' },
    { key: 'voice-bridge', label: t('pages.settings.siteTabs.voiceBridge'), icon: 'i-lucide-phone' }
  ]

  return tabs
})

function tabFromQuery(): SiteDetailTab | null {
  const requested = route.query.tab
  const validTabs: Array<SiteDetailTab> = ['general', 'floor-maps', 'integrations', 'service-areas', 'voice-bridge']
  return typeof requested === 'string' && validTabs.includes(requested as SiteDetailTab)
    ? requested as SiteDetailTab
    : null
}

const activeTab = ref<SiteDetailTab>(tabFromQuery() ?? 'general')

watch(enabledTabs, (tabs) => {
  if (!tabs.some(tab => tab.key === activeTab.value)) {
    activeTab.value = tabs[0]?.key ?? 'general'
  }
}, { immediate: true })

function isLoading(field: string) {
  return updatingField.value === field
}

function fieldError(field: string) {
  return fieldErrors.value[field] ?? null
}

async function onTextSave(field: string, value: InlineFieldValue) {
  const updated = await updateField(field, typeof value === 'string' ? value : null)
  if (updated) {
    await refresh()
  }
}

async function onCountrySave(value: InlineFieldValue) {
  const parsed = value == null || value === ''
    ? null
    : Number(value)
  const countryId = parsed == null || Number.isNaN(parsed) ? null : parsed

  const updated = await updateField('country_id', countryId)
  if (updated) {
    await refresh()
  }
}

async function onLegalEntitySave(value: InlineFieldValue) {
  const parsed = value == null || value === ''
    ? null
    : Number(value)
  const entityId = parsed == null || Number.isNaN(parsed) ? null : parsed

  const updated = await updateField('legal_entity_id', entityId)
  if (updated) {
    await refresh()
  }
}

async function onLocationSave(axis: 'lat' | 'lng', value: InlineFieldValue) {
  const parsed = value == null || value === ''
    ? null
    : Number(value)

  const num = parsed == null || Number.isNaN(parsed) ? null : parsed
  const current = site.value?.location
  const lat = axis === 'lat' ? num : (current?.lat ?? null)
  const lng = axis === 'lng' ? num : (current?.lng ?? null)

  const trackingField = axis === 'lat' ? 'location_lat' : 'location_lng'
  const payload = lat == null && lng == null
    ? { location: null }
    : { location: { lat, lng } }

  const updated = await updatePayload(trackingField, payload)
  if (updated) {
    await refresh()
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <UButton
        to="/settings/facility/sites"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :label="$t('pages.settings.sitesBack')"
        class="mb-3"
      />

      <div
        v-if="pending"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="error || !site"
        class="rounded-lg border border-error/30 bg-error/5 p-4"
      >
        <p class="text-sm text-error">
          {{ $t('pages.settings.siteLoadError') }}
        </p>
        <UButton
          :label="$t('common.retry')"
          color="neutral"
          variant="outline"
          size="sm"
          class="mt-3"
          @click="refresh()"
        />
      </div>

      <template v-else>
        <div>
          <h1 class="text-2xl font-semibold text-highlighted">
            {{ site.name }}
          </h1>
          <p
            v-if="site.code"
            class="mt-1 text-sm text-dimmed"
          >
            {{ site.code }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ site.timezone }}
          </p>
        </div>

        <UTabs
          v-model="activeTab"
          :items="enabledTabs.map(tab => ({ label: tab.label, value: tab.key, icon: tab.icon }))"
          class="mt-6"
          :content="false"
        />

        <div class="mt-6">
          <div
            v-if="activeTab === 'general'"
            class="grid gap-x-6 gap-y-5 sm:grid-cols-2"
          >
            <InlineField
              :label="$t('forms.site.name')"
              :value="site.name"
              type="text"
              required
              :nullable="false"
              :loading="isLoading('name')"
              :error="fieldError('name')"
              @save="onTextSave('name', $event)"
            />

            <InlineField
              :label="$t('forms.site.code')"
              :value="site.code"
              type="text"
              :loading="isLoading('code')"
              :error="fieldError('code')"
              @save="onTextSave('code', $event)"
            />

            <InlineField
              :label="$t('forms.site.timezone')"
              :value="site.timezone"
              type="select"
              :options="timezoneOptions"
              required
              :nullable="false"
              :loading="isLoading('timezone')"
              :error="fieldError('timezone')"
              @save="onTextSave('timezone', $event)"
            />

            <InlineField
              :label="$t('forms.site.country')"
              :value="site.country_id != null ? String(site.country_id) : null"
              :display-value="site.country?.name ?? undefined"
              type="select"
              :options="countryOptions"
              required
              :nullable="false"
              :loading="isLoading('country_id')"
              :error="fieldError('country_id')"
              @save="onCountrySave"
            />

            <InlineField
              :label="$t('forms.site.legalEntity')"
              :value="String(site.legal_entity_id)"
              :display-value="site.legal_entity?.legal_name ?? undefined"
              type="select"
              :options="legalEntityOptions"
              required
              :nullable="false"
              :loading="isLoading('legal_entity_id')"
              :error="fieldError('legal_entity_id')"
              @save="onLegalEntitySave"
            />

            <InlineField
              :label="$t('forms.site.address')"
              :value="site.address"
              type="text"
              :loading="isLoading('address')"
              :error="fieldError('address')"
              @save="onTextSave('address', $event)"
            />

            <InlineField
              :label="$t('forms.site.addressLine2')"
              :value="site.address_line_2"
              type="text"
              :loading="isLoading('address_line_2')"
              :error="fieldError('address_line_2')"
              @save="onTextSave('address_line_2', $event)"
            />

            <InlineField
              :label="$t('forms.site.city')"
              :value="site.city"
              type="text"
              :loading="isLoading('city')"
              :error="fieldError('city')"
              @save="onTextSave('city', $event)"
            />

            <InlineField
              :label="$t('forms.site.stateRegion')"
              :value="site.state_region"
              type="text"
              :loading="isLoading('state_region')"
              :error="fieldError('state_region')"
              @save="onTextSave('state_region', $event)"
            />

            <InlineField
              :label="$t('forms.site.postalCode')"
              :value="site.postal_code"
              type="text"
              :loading="isLoading('postal_code')"
              :error="fieldError('postal_code')"
              @save="onTextSave('postal_code', $event)"
            />

            <InlineField
              :label="$t('forms.site.contactEmail')"
              :value="site.contact_email"
              type="email"
              :loading="isLoading('contact_email')"
              :error="fieldError('contact_email')"
              @save="onTextSave('contact_email', $event)"
            />

            <InlineField
              :label="$t('forms.site.contactPhone')"
              :value="site.contact_phone"
              type="text"
              :loading="isLoading('contact_phone')"
              :error="fieldError('contact_phone')"
              @save="onTextSave('contact_phone', $event)"
            />

            <InlineField
              :label="$t('forms.site.lat')"
              :value="site.location?.lat != null ? String(site.location.lat) : null"
              type="number"
              :loading="isLoading('location_lat')"
              :error="fieldError('location_lat') ?? fieldError('location.lat')"
              @save="onLocationSave('lat', $event)"
            />

            <InlineField
              :label="$t('forms.site.lng')"
              :value="site.location?.lng != null ? String(site.location.lng) : null"
              type="number"
              :loading="isLoading('location_lng')"
              :error="fieldError('location_lng') ?? fieldError('location.lng')"
              @save="onLocationSave('lng', $event)"
            />
          </div>

          <FacilitySiteFloorMapsTab
            v-else-if="activeTab === 'floor-maps'"
            :site-id="site.id"
          />

          <FacilitySiteIntegrationsTab
            v-else-if="activeTab === 'integrations'"
            :site-id="site.id"
          />

          <FacilitySiteServiceAreasTab
            v-else-if="activeTab === 'service-areas'"
            :site-id="site.id"
          />

          <FacilitySiteVoiceBridgeTab
            v-else-if="activeTab === 'voice-bridge'"
            :site-id="site.id"
          />
        </div>
      </template>
    </div>
  </UContainer>
</template>
