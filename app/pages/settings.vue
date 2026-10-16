<script setup lang="ts">
const route = useRoute()

const isMapBuilder = computed(() => /\/sites\/\d+\/maps\/(?:new|\d+)$/.test(route.path))
</script>

<template>
  <div
    class="flex min-h-0 flex-col overflow-hidden lg:flex-row"
    :class="isMapBuilder ? 'h-[calc(100dvh-4rem)]' : 'h-[calc(100svh-var(--ui-header-height))]'"
  >
    <SettingsSidebar v-if="!isMapBuilder" />

    <main
      class="min-h-0 min-w-0 flex-1"
      :class="isMapBuilder ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8'"
    >
      <NuxtPage />
    </main>
  </div>
</template>
