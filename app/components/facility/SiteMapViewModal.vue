<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  mapId: number | null
}>()

const { pending, error, svgMap, floorName, load, reset } = useSiteMapViewer()

watch(open, async (isOpen) => {
  if (isOpen && props.mapId != null) {
    await load(props.mapId)
    return
  }

  reset()
})

watch(() => props.mapId, async (mapId) => {
  if (open.value && mapId != null) {
    await load(mapId)
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="floorName ?? $t('forms.siteMap.viewTitle')"
    :ui="{ content: 'max-w-5xl w-full' }"
  >
    <template #body>
      <div
        v-if="pending"
        class="flex items-center justify-center py-12"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="error"
        class="rounded-lg border border-error/30 bg-error/5 p-4"
      >
        <p class="text-sm text-error">
          {{ error }}
        </p>
      </div>

      <div
        v-else-if="svgMap"
        class="max-h-[70vh] overflow-auto rounded-lg border border-default bg-default p-4"
      >
        <div v-html="svgMap" />
      </div>
    </template>
  </UModal>
</template>
