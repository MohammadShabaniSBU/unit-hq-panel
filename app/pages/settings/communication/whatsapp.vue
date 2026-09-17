<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.whatsapp')"
      :subtitle="t('pages.settings.communicationsSubtitle')"
    />

    <SettingsCommunicationsSettingsForm channel="whatsapp" />
  </div>
</template>
