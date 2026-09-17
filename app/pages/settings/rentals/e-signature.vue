<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div>
    <SettingsSectionHeader
      :title="t('settings.nav.eSignature')"
      :subtitle="t('pages.settings.esignSubtitle')"
    />

    <SettingsEsignSettingsForm />
  </div>
</template>
