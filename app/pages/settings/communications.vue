<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.communications')"
      :subtitle="t('pages.settings.communicationsSubtitle')"
    />

    <SettingsCommunicationsSettingsForm />
  </div>
</template>
