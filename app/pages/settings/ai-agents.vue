<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { canAny } = usePermissions()
if (!canAny([Permission.SettingsManage, Permission.AiAgentUse])) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.aiAgents')"
      :subtitle="t('pages.settings.aiAgentsSubtitle')"
    />

    <SettingsAiAgentWritePoliciesForm />
  </div>
</template>
