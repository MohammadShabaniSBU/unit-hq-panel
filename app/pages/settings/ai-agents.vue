<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { canAny, can } = usePermissions()
if (!canAny([Permission.SettingsManage, Permission.AiAgentUse, Permission.AiAgentBindingManage])) {
  await navigateTo('/settings/general')
}

const { t } = useI18n()
const canBindings = computed(() => can(Permission.AiAgentBindingManage))
const canPolicies = computed(() => canAny([Permission.SettingsManage, Permission.AiAgentUse]))

const activeTab = ref<'policies' | 'channels'>(
  canBindings.value && !canPolicies.value ? 'channels' : 'policies'
)

watch(canBindings, (on) => {
  if (!on && activeTab.value === 'channels') {
    activeTab.value = 'policies'
  }
})

const tabItems = computed(() => {
  const items: Array<{ label: string, value: 'policies' | 'channels' }> = []
  if (canPolicies.value) {
    items.push({ label: t('pages.settings.aiAgentsTabs.policies'), value: 'policies' })
  }
  if (canBindings.value) {
    items.push({ label: t('pages.settings.aiAgentsTabs.channels'), value: 'channels' })
  }
  return items
})
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.aiAgents')"
      :subtitle="t('pages.settings.aiAgentsSubtitle')"
    />

    <UTabs
      v-model="activeTab"
      :items="tabItems"
      class="w-full"
      :content="false"
    />

    <div class="mt-6">
      <SettingsAiAgentWritePoliciesForm v-if="activeTab === 'policies'" />
      <SettingsAiAgentChannelBindingsTable v-else-if="activeTab === 'channels' && canBindings" />
    </div>
  </div>
</template>
