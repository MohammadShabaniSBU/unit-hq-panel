<script setup lang="ts">
const VISIBLE_TOOLS = 3

const props = defineProps<{
  tools: Array<string>
}>()

const { t } = useI18n()

function toolLabel(key: string): string {
  const path = `ai.tools.${key}`
  const label = t(path)
  return label === path ? key : label
}

const visible = computed(() => props.tools.slice(0, VISIBLE_TOOLS))
const overflowCount = computed(() => Math.max(0, props.tools.length - VISIBLE_TOOLS))
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <UBadge
      v-for="tool in visible"
      :key="tool"
      color="neutral"
      variant="subtle"
      size="sm"
      :label="toolLabel(tool)"
    />
    <UPopover
      v-if="overflowCount > 0"
      :content="{ align: 'start' }"
    >
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :label="t('ai.bindings.moreTools', { count: overflowCount })"
      />
      <template #content>
        <div class="flex max-h-72 max-w-xs flex-wrap gap-1 overflow-y-auto p-2">
          <UBadge
            v-for="tool in tools"
            :key="tool"
            color="neutral"
            variant="subtle"
            size="sm"
            :label="toolLabel(tool)"
          />
        </div>
      </template>
    </UPopover>
  </div>
</template>
