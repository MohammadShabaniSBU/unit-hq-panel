<script setup lang="ts">
import type { UpdateObjectActionConfig, UpdateObjectTargetSource, FieldUpdate, ValueSource } from '~/types/automation'

const props = defineProps<{
  config: UpdateObjectActionConfig
}>()

const emit = defineEmits<{
  'update:config': [config: UpdateObjectActionConfig]
}>()

const objectTypeOptions = [
  { label: 'Contact', value: 'contact' },
  { label: 'Deal', value: 'deal' },
  { label: 'Unit', value: 'unit' },
  { label: 'Contract', value: 'contract' },
  { label: 'Reservation', value: 'reservation' },
]

const targetSourceOptions: Array<{ label: string; value: UpdateObjectTargetSource }> = [
  { label: 'Object from trigger', value: 'trigger_object' },
  { label: 'Specific record ID', value: 'static_id' },
  { label: 'Dynamic expression', value: 'dynamic' },
]

const valueKindOptions = [
  { label: 'Static value', value: 'static' },
  { label: 'Dynamic expression', value: 'dynamic' },
]

function update(patch: Partial<UpdateObjectActionConfig>) {
  emit('update:config', { ...props.config, ...patch })
}

function addUpdate() {
  const newUpdate: FieldUpdate = {
    property: '',
    value: { kind: 'static', value: '' },
  }
  emit('update:config', {
    ...props.config,
    updates: [...props.config.updates, newUpdate],
  })
}

function removeUpdate(index: number) {
  emit('update:config', {
    ...props.config,
    updates: props.config.updates.filter((_, i) => i !== index),
  })
}

function updateFieldProp(index: number, property: string) {
  const updates = props.config.updates.map((u, i) => i === index ? { ...u, property } : u)
  emit('update:config', { ...props.config, updates })
}

function updateFieldValue(index: number, value: ValueSource) {
  const updates = props.config.updates.map((u, i) => i === index ? { ...u, value } : u)
  emit('update:config', { ...props.config, updates })
}
</script>

<template>
  <div class="space-y-4">
    <UFormField :label="$t('automations.config.objectType')">
      <USelect
        :model-value="config.objectType"
        :options="objectTypeOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ objectType: $event })"
      />
    </UFormField>

    <UFormField :label="$t('automations.config.targetSource')">
      <USelect
        :model-value="config.targetSource"
        :options="targetSourceOptions"
        value-key="value"
        class="w-full"
        @update:model-value="update({ targetSource: $event })"
      />
    </UFormField>

    <UFormField
      v-if="config.targetSource === 'static_id'"
      :label="$t('automations.config.staticId')"
    >
      <UInput
        :model-value="config.staticId ?? ''"
        :placeholder="$t('automations.config.staticIdPlaceholder')"
        class="w-full"
        @update:model-value="update({ staticId: $event })"
      />
    </UFormField>

    <UFormField
      v-if="config.targetSource === 'dynamic'"
      :label="$t('automations.config.dynamicExpression')"
    >
      <UInput
        :model-value="config.dynamicExpression ?? ''"
        placeholder="{{trigger.contact.id}}"
        class="w-full font-mono"
        @update:model-value="update({ dynamicExpression: $event })"
      />
    </UFormField>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-highlighted">{{ $t('automations.config.fieldUpdates') }}</span>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-plus"
          :label="$t('automations.config.addUpdate')"
          @click="addUpdate"
        />
      </div>

      <div
        v-if="config.updates.length === 0"
        class="rounded-lg border border-dashed border-default py-4 text-center text-xs text-dimmed"
      >
        {{ $t('automations.config.noUpdates') }}
      </div>

      <div
        v-else
        class="space-y-2"
      >
        <div
          v-for="(fieldUpdate, idx) in config.updates"
          :key="idx"
          class="rounded-lg border border-default bg-elevated p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-dimmed">{{ $t('automations.config.field') }} {{ idx + 1 }}</span>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="removeUpdate(idx)"
            />
          </div>
          <div class="space-y-1.5">
            <UInput
              :model-value="fieldUpdate.property"
              :placeholder="$t('automations.config.propertyPlaceholder')"
              class="w-full"
              @update:model-value="updateFieldProp(idx, $event)"
            />
            <USelect
              :model-value="fieldUpdate.value.kind"
              :options="valueKindOptions"
              value-key="value"
              class="w-full"
              @update:model-value="updateFieldValue(idx, $event === 'dynamic'
                ? { kind: 'dynamic', expression: '' }
                : { kind: 'static', value: '' })"
            />
            <UInput
              v-if="fieldUpdate.value.kind === 'static'"
              :model-value="String(fieldUpdate.value.value ?? '')"
              :placeholder="$t('automations.config.valuePlaceholder')"
              class="w-full"
              @update:model-value="updateFieldValue(idx, { kind: 'static', value: $event })"
            />
            <UInput
              v-else
              :model-value="fieldUpdate.value.expression"
              placeholder="{{trigger.contact.status}}"
              class="w-full font-mono"
              @update:model-value="updateFieldValue(idx, { kind: 'dynamic', expression: $event })"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
