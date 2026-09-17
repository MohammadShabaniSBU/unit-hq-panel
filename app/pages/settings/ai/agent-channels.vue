<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { can } = usePermissions()
if (!can(Permission.AiAgentBindingManage)) {
  await navigateTo('/settings/workspace/general')
}

const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.agentChannels')"
      :subtitle="t('pages.settings.aiAgentsSubtitle')"
    />

    <SettingsAiAgentChannelBindingsTable />
  </div>
</template>
