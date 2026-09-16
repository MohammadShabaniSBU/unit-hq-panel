<script setup lang="ts">
import type { AutomationNodeType } from '~/types/automation'

const emit = defineEmits<{
  select: [type: AutomationNodeType]
}>()

const open = ref(false)

function handleSelect(type: AutomationNodeType) {
  open.value = false
  emit('select', type)
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      icon="i-lucide-plus"
      color="neutral"
      variant="outline"
      size="xs"
      square
      class="rounded-full shadow-sm"
      :aria-label="$t('automations.editor.addStep')"
      @click.stop
      @mousedown.stop
    />
    <template #content>
      <AutomationAddNodeMenu @select="handleSelect" />
    </template>
  </UPopover>
</template>
