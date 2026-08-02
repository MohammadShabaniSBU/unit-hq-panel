<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.access')"
      :subtitle="t('pages.settings.accessSubtitle')"
    />

    <SettingsAccessSettingsForm />
  </div>
</template>
