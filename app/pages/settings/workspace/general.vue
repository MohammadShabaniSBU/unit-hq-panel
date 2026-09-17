<script setup lang="ts">
import type { ApiGeneralSettings } from '~/types/settings'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-general',
  () => get<ApiGeneralSettings>('/api/settings/general')
)

const settings = computed(() => data.value?.data ?? null)
const deployment = useDeploymentStore()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.general')"
      :subtitle="t('pages.settings.generalSubtitle')"
    />

    <div class="mb-6 rounded-lg border border-default px-4 py-3">
      <p class="text-sm font-medium text-highlighted">
        {{ t('pages.settings.deploymentCountry') }}
      </p>
      <p class="mt-1 text-sm text-dimmed">
        {{ deployment.country }} · {{ deployment.currency }}
      </p>
      <p class="mt-1 text-xs text-dimmed">
        {{ t('pages.settings.deploymentCountryHelp') }}
      </p>
    </div>

    <SettingsLoadError
      v-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <SettingsGeneralSettingsForm
      v-else
      :settings="settings"
      :pending="pending"
    />
  </div>
</template>
