<script setup lang="ts">
import type { ApiAttributeDefinition } from '~/types/attribute'
import type { CreateAttributeValue } from '~/composables/useRequiredCreateAttributes'

const props = defineProps<{
  definitions: Array<ApiAttributeDefinition>
  values: Record<number, CreateAttributeValue>
  fieldErrors: Record<number, string>
}>()

const emit = defineEmits<{
  'update:value': [definitionId: number, value: CreateAttributeValue]
}>()

function optionsFor(definition: ApiAttributeDefinition) {
  return (definition.options ?? []).map(option => ({
    label: option.label,
    value: option.id
  }))
}

function onTextInput(definitionId: number, event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:value', definitionId, target?.value ?? '')
}

function onNumberInput(definitionId: number, event: Event) {
  const target = event.target as HTMLInputElement | null
  const raw = target?.value ?? ''
  if (raw.trim() === '') {
    emit('update:value', definitionId, null)
    return
  }

  emit('update:value', definitionId, Number(raw))
}

function selectModel(definitionId: number): number | undefined {
  const value = props.values[definitionId]
  return typeof value === 'number' ? value : undefined
}

function multiModel(definitionId: number): Array<number> {
  const value = props.values[definitionId]
  return Array.isArray(value) ? value : []
}
</script>

<template>
  <div
    v-if="definitions.length"
    class="flex flex-col gap-4"
  >
    <UFormField
      v-for="definition in definitions"
      :key="definition.id"
      :label="definition.label"
      :name="`attribute_${definition.id}`"
      required
      :error="fieldErrors[definition.id]"
    >
      <UInput
        v-if="definition.type === 'text'"
        :model-value="typeof values[definition.id] === 'string' ? values[definition.id] as string : ''"
        class="w-full"
        @input="onTextInput(definition.id, $event)"
      />

      <UInput
        v-else-if="definition.type === 'number'"
        type="number"
        :model-value="values[definition.id] == null ? '' : String(values[definition.id])"
        class="w-full"
        @input="onNumberInput(definition.id, $event)"
      />

      <UInput
        v-else-if="definition.type === 'date'"
        type="date"
        :model-value="typeof values[definition.id] === 'string' ? values[definition.id] as string : ''"
        class="w-full"
        @input="onTextInput(definition.id, $event)"
      />

      <UCheckbox
        v-else-if="definition.type === 'boolean'"
        :model-value="values[definition.id] === true"
        @update:model-value="emit('update:value', definition.id, $event === true)"
      />

      <USelect
        v-else-if="definition.type === 'select'"
        :model-value="selectModel(definition.id)"
        :items="optionsFor(definition)"
        value-key="value"
        label-key="label"
        :placeholder="definition.label"
        class="w-full"
        @update:model-value="emit('update:value', definition.id, ($event as number | undefined) ?? null)"
      />

      <USelect
        v-else-if="definition.type === 'multiselect'"
        :model-value="multiModel(definition.id)"
        :items="optionsFor(definition)"
        value-key="value"
        label-key="label"
        multiple
        :placeholder="definition.label"
        class="w-full"
        @update:model-value="emit('update:value', definition.id, Array.isArray($event) ? $event as Array<number> : [])"
      />
    </UFormField>
  </div>
</template>
