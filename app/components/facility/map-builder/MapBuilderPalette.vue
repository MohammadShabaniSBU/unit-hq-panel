<script setup lang="ts">
import type { FloorMapTool } from '~/types/floorMapBuilder'

const props = defineProps<{
  tool: FloorMapTool
}>()

const emit = defineEmits<{
  'update:tool': [tool: FloorMapTool]
}>()

const tools: Array<{ id: FloorMapTool, icon: string, labelKey: string }> = [
  { id: 'select', icon: 'i-lucide-mouse-pointer-2', labelKey: 'pages.settings.mapBuilder.toolSelect' },
  { id: 'unit', icon: 'i-lucide-box', labelKey: 'pages.settings.mapBuilder.toolUnit' },
  { id: 'entrance', icon: 'i-lucide-door-open', labelKey: 'pages.settings.mapBuilder.toolEntrance' }
]
</script>

<template>
  <div class="flex flex-row items-center gap-2 p-2 lg:flex-col lg:items-stretch lg:gap-3 lg:p-3">
    <p class="hidden text-xs font-semibold uppercase tracking-wide text-dimmed lg:block">
      {{ $t('pages.settings.mapBuilder.paletteTitle') }}
    </p>
    <p class="hidden text-xs text-muted lg:block">
      {{ $t('pages.settings.mapBuilder.paletteHint') }}
    </p>
    <div class="flex flex-row gap-1 lg:flex-col">
      <UButton
        v-for="item in tools"
        :key="item.id"
        :icon="item.icon"
        :label="$t(item.labelKey)"
        :color="props.tool === item.id ? 'primary' : 'neutral'"
        :variant="props.tool === item.id ? 'soft' : 'ghost'"
        :block="false"
        class="lg:w-full lg:justify-start"
        @click="emit('update:tool', item.id)"
      />
    </div>
  </div>
</template>
