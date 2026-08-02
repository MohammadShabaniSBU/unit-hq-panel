<script setup lang="ts">
const route = useRoute()
const id = computed(() => route.params.id as string)
</script>

<template>
  <UContainer class="py-8">
    <WhatsappTemplatesTemplateEditor :id="id" />
  </UContainer>
</template>
