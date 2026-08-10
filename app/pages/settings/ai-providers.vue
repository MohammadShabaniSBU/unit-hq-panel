<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.aiProviders')"
      :subtitle="t('pages.settings.aiProvidersSubtitle')"
    />

    <SettingsAiProviderAccountsPanel />
  </div>
</template>
