<script setup lang="ts">
const { ensureLoaded, dashboardItem, pending, loaded } = useInsightRegistry()

onMounted(async () => {
  await ensureLoaded()
  const dashboard = dashboardItem()
  if (dashboard) {
    await navigateTo(`/insights/${dashboard.key}`, { replace: true })
  }
})
</script>

<template>
  <UContainer class="py-8">
    <div
      v-if="pending || !loaded"
      class="text-muted py-12 text-center text-sm"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-else
      class="flex flex-col items-start gap-4 py-12"
    >
      <p class="text-highlighted text-lg font-medium">
        {{ $t('insights.states.not_found') }}
      </p>
      <p class="text-muted text-sm">
        {{ $t('insights.states.dashboardHidden') }}
      </p>
    </div>
  </UContainer>
</template>
