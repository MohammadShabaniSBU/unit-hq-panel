<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { can } = usePermissions()

if (!can(Permission.ReportView)) {
  await navigateTo('/settings/workspace/general')
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.usage')"
      :subtitle="t('pages.settings.aiProvidersSubtitle')"
    />

    <SettingsAiUsagePanel />
  </div>
</template>
