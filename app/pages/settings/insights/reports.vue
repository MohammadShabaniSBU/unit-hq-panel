<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { can } = usePermissions()

if (!can(Permission.SettingsManage)) {
  await navigateTo('/settings/workspace/general')
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.reports')"
      :subtitle="t('pages.settings.insightsSubtitle')"
    />

    <SettingsInsightsReportsPanel />
  </div>
</template>
