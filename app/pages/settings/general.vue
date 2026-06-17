<script setup lang="ts">
import type { ApiGeneralSettings } from '~/types/settings'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-general',
  () => get<ApiGeneralSettings>('/api/settings/general')
)

const settings = computed(() => data.value?.data ?? null)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.general')"
      :subtitle="t('pages.settings.generalSubtitle')"
    />

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
