<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('pages.settings.esign')"
      :subtitle="t('pages.settings.esignSubtitle')"
    />

    <SettingsEsignSettingsForm />
  </div>
</template>
