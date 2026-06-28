<script setup lang="ts">
import type { ApiLeasingSettings } from '~/types/settings'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-leasing',
  () => get<ApiLeasingSettings>('/api/settings/leasing')
)

const settings = computed(() => data.value?.data ?? null)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.leasingSettings')"
      :subtitle="t('pages.settings.leasingSettingsSubtitle')"
    />

    <SettingsLoadError
      v-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <SettingsLeasingSettingsForm
      v-else
      :settings="settings"
      :pending="pending"
    />
  </div>
</template>
