<script setup lang="ts">
import type { SpacerBlockParams } from '~/types/email-builder'

defineProps<{
  params: SpacerBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div
    class="w-full bg-transparent"
    :style="{ height: `${params.height}px` }"
  />
</template>
