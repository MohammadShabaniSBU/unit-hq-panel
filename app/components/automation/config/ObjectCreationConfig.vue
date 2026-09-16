<script setup lang="ts">
import type { ObjectCreationTriggerConfig, FilterGroup } from '~/types/automation'

const props = defineProps<{
  config: ObjectCreationTriggerConfig
}>()

const emit = defineEmits<{
  'update:config': [config: ObjectCreationTriggerConfig]
}>()

const { items: objectTypeOptions } = useTriggerObjectTypeOptions(true)

function update(patch: Partial<ObjectCreationTriggerConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function onObjectTypeChange(next: string) {
  emit('update:config', {
    ...props.config,
    objectType: next,
    filters: {
      ...props.config.filters,
      conditions: props.config.filters.conditions.map((c) => {
        if (!('field' in c)) {
          return c
        }
        return { ...c, field: '' }
      })
    }
  })
}

function updateFilters(group: FilterGroup) {
  update({ filters: group })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.objectType')">
      <USelectMenu
        :model-value="config.objectType"
        :items="objectTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="onObjectTypeChange($event)"
      />
    </UFormField>

    <AutomationConfigFilterGroupEditor
      :group="config.filters"
      :object-type="config.objectType"
      @update:group="updateFilters"
    />
  </div>
</template>
