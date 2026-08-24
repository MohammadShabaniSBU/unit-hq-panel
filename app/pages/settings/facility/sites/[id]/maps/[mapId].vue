<script setup lang="ts">
const route = useRoute()
const siteId = computed(() => Number(route.params.id))
const mapId = computed(() => Number(route.params.mapId))
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col">
    <FacilityMapBuilder
      :site-id="siteId"
      :map-id="mapId"
    />
  </div>
</template>
