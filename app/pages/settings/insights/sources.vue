<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { can } = usePermissions()

if (!can(Permission.CredentialManage)) {
  await navigateTo('/settings/workspace/general')
}
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.reportSources')"
      :subtitle="t('pages.settings.insightsSubtitle')"
    />

    <SettingsInsightsConnectionsPanel />
  </div>
</template>
