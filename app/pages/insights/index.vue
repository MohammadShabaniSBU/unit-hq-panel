<script setup lang="ts">
import { REPORT_CATALOG } from '~/composables/useReport'

const { t } = useI18n()
</script>

<template>
  <UContainer class="py-8">
    <UPageHeader
      :title="$t('pages.insights.title')"
      :description="$t('pages.insights.subtitle')"
      class="mb-8"
    />

    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="report in REPORT_CATALOG"
        :key="report.name"
      >
        <NuxtLink
          :to="report.to"
          class="block rounded-lg border border-default bg-default p-5 transition hover:border-primary"
        >
          <h2 class="text-highlighted font-medium">
            {{ t(report.titleKey) }}
          </h2>
          <p class="text-muted mt-1 text-sm">
            {{ t(report.descriptionKey) }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </UContainer>
</template>
