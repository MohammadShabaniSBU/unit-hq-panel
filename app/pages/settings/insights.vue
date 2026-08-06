<script setup lang="ts">
import { Permission } from '~/types/permissions'

const { t } = useI18n()
const { can, canAny } = usePermissions()

const canConnections = computed(() => can(Permission.CredentialManage))
const canReports = computed(() => can(Permission.SettingsManage))
const canAnyInsights = computed(() =>
  canAny([Permission.CredentialManage, Permission.SettingsManage])
)

const activeTab = ref<'connections' | 'reports'>('connections')

watchEffect(() => {
  if (canConnections.value && !canReports.value) {
    activeTab.value = 'connections'
  } else if (!canConnections.value && canReports.value) {
    activeTab.value = 'reports'
  }
})

const tabItems = computed(() => {
  const items: Array<{ label: string, value: 'connections' | 'reports' }> = []
  if (canConnections.value) {
    items.push({
      label: t('settings.insights.tabs.connections'),
      value: 'connections'
    })
  }
  if (canReports.value) {
    items.push({
      label: t('settings.insights.tabs.reports'),
      value: 'reports'
    })
  }
  return items
})
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.insights')"
      :subtitle="t('pages.settings.insightsSubtitle')"
    />

    <p
      v-if="!canAnyInsights"
      class="text-sm text-dimmed"
    >
      {{ t('settings.insights.noPermission') }}
    </p>

    <template v-else>
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        class="w-full"
        :content="false"
      />

      <div class="mt-6">
        <SettingsInsightsConnectionsPanel v-if="activeTab === 'connections' && canConnections" />
        <SettingsInsightsReportsPanel v-else-if="activeTab === 'reports' && canReports" />
      </div>
    </template>
  </div>
</template>
