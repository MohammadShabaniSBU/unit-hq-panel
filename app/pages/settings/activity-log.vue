<script setup lang="ts">
import type { ApiActivityLogSettings } from '~/types/activity'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-activity-log',
  () => get<ApiActivityLogSettings>('/api/settings/activity-log')
)

const settings = computed(() => data.value?.data ?? null)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.activityLog')"
      :subtitle="t('pages.settings.activityLogSubtitle')"
    />

    <SettingsLoadError
      v-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <SettingsActivityLogSettingsForm
      v-else
      :settings="settings"
      :pending="pending"
    />
  </div>
</template>
