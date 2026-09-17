<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.email')"
      :subtitle="t('pages.settings.communicationsSubtitle')"
    />

    <SettingsCommunicationsSettingsForm channel="email" />
  </div>
</template>
