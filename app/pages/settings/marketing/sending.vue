<script setup lang="ts">
import type { ApiMarketingSettings } from '~/types/settings'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-marketing',
  () => get<ApiMarketingSettings>('/api/settings/marketing')
)

const settings = computed(() => data.value?.data ?? null)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.marketingSending')"
      :subtitle="t('pages.settings.marketingSettingsSubtitle')"
    />

    <SettingsLoadError
      v-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <SettingsMarketingSettingsForm
      v-else
      :settings="settings"
      :pending="pending"
    />
  </div>
</template>
