<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.calls')"
      :subtitle="t('pages.settings.communicationsSubtitle')"
    />

    <SettingsCommunicationsSettingsForm channel="call" />
  </div>
</template>
