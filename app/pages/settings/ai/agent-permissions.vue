<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { canAny } = usePermissions()
if (!canAny([Permission.SettingsManage, Permission.AiAgentUse])) {
  await navigateTo('/settings/workspace/general')
}

const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.agentPermissions')"
      :subtitle="t('pages.settings.aiAgentsSubtitle')"
    />

    <SettingsAiAgentWritePoliciesForm />
  </div>
</template>
