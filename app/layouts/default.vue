<script setup lang="ts">
const sidebarOpen = ref(true)
</script>

<template>
  <div class="flex min-h-svh flex-1">
    <LayoutAppSidebar v-model:open="sidebarOpen" />

    <div class="flex min-w-0 flex-1 flex-col">
      <UHeader>
        <template #left>
          <UButton
            icon="i-lucide-panel-left"
            color="neutral"
            variant="ghost"
            aria-label="Toggle sidebar"
            @click="sidebarOpen = !sidebarOpen"
          />
        </template>

        <template #right>
          <UColorModeButton />
        </template>
      </UHeader>

      <UMain class="w-full">
        <slot />
      </UMain>
    </div>
  </div>
</template>
