<script setup lang="ts">
const route = useRoute()

const isMapBuilder = computed(() => /\/sites\/\d+\/maps\/(?:new|\d+)$/.test(route.path))
</script>

<template>
  <div
    class="flex flex-col lg:flex-row"
    :class="isMapBuilder ? 'h-[calc(100dvh-4rem)] overflow-hidden' : 'min-h-[calc(100dvh-4rem)]'"
  >
    <SettingsSidebar v-if="!isMapBuilder" />

    <main
      class="min-w-0 flex-1"
      :class="isMapBuilder ? 'flex min-h-0 flex-col overflow-hidden' : 'px-4 py-6 sm:px-6 lg:px-8'"
    >
      <NuxtPage />
    </main>
  </div>
</template>
