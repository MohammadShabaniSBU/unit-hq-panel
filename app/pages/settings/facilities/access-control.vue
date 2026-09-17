<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.accessControl')"
      :subtitle="t('pages.settings.accessSubtitle')"
    />

    <SettingsAccessSettingsForm />
  </div>
</template>
