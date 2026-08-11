<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { can } = usePermissions()

const canUsage = computed(() => can(Permission.ReportView))

const activeTab = ref<'accounts' | 'usage'>('accounts')

const tabItems = computed(() => {
  const items: Array<{ label: string, value: 'accounts' | 'usage' }> = [
    { label: t('settings.ai.tabs.accounts'), value: 'accounts' }
  ]
  if (canUsage.value) {
    items.push({ label: t('settings.ai.tabs.usage'), value: 'usage' })
  }
  return items
})
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.aiProviders')"
      :subtitle="t('pages.settings.aiProvidersSubtitle')"
    />

    <UTabs
      v-model="activeTab"
      :items="tabItems"
      class="w-full"
      :content="false"
    />

    <div class="mt-6">
      <SettingsAiProviderAccountsPanel v-if="activeTab === 'accounts'" />
      <SettingsAiUsagePanel v-else-if="activeTab === 'usage' && canUsage" />
    </div>
  </div>
</template>
