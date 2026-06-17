<script setup lang="ts">
import type { ApiBillingSettings } from '~/types/settings'

const { t } = useI18n()
const { get } = useApi()

const { data, pending, error, refresh } = useAsyncData(
  'settings-billing',
  () => get<ApiBillingSettings>('/api/settings/billing')
)

const settings = computed(() => data.value?.data ?? null)
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.billing')"
      :subtitle="t('pages.settings.billingSubtitle')"
    />

    <SettingsLoadError
      v-if="error"
      :message="t('pages.settings.loadError')"
      @retry="refresh()"
    />

    <SettingsBillingSettingsForm
      v-else
      :settings="settings"
      :pending="pending"
    />
  </div>
</template>
