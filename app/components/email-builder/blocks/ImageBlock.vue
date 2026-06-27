<script setup lang="ts">
import type { ImageBlockProps } from '~/types/email-builder'

defineProps<{
  props: ImageBlockProps
  selected?: boolean
}>()
</script>

<template>
  <div
    class="w-full px-4 py-3"
    :style="{ textAlign: props.align }"
  >
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt"
      :style="{ maxWidth: `${props.width}px`, width: '100%', display: 'inline-block' }"
    >
    <div
      v-else
      class="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-default bg-muted text-dimmed"
      :style="{ width: `${Math.min(props.width, 600)}px`, maxWidth: '100%', height: '120px' }"
    >
      <div class="flex flex-col items-center gap-1">
        <UIcon
          name="i-lucide-image"
          class="size-6"
        />
        <span class="text-xs">{{ props.alt || 'Image' }}</span>
      </div>
    </div>
  </div>
</template>
