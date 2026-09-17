<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.sms')"
      :subtitle="t('pages.settings.communicationsSubtitle')"
    />

    <SettingsCommunicationsSettingsForm channel="sms" />
  </div>
</template>
