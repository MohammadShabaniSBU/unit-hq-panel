<script setup lang="ts">
import type { DynamicParamKey, InsightParamDraft, InsightParamBinding, InsightParamValueSource } from '~/types/insights'
import { compatibleDynamicKeys } from '~/types/insights'

const model = defineModel<InsightParamDraft>({ required: true })

const { t } = useI18n()

const valueSourceItems = computed(() => [
  { value: 'static' as const, label: t('insights.params.valueSourceStatic') },
  { value: 'dynamic' as const, label: t('insights.params.valueSourceDynamic') }
])

const bindingItems = computed(() => [
  { value: 'locked' as const, label: t('insights.params.locked') },
  { value: 'default' as const, label: t('insights.params.editableFilter') }
])

const dynamicKeyItems = computed(() =>
  compatibleDynamicKeys(model.value.provider_type).map(key => ({
    value: key,
    label: t(`insights.params.dynamic.${key}`)
  }))
)

const isDynamic = computed(() => model.value.value_source === 'dynamic')

const embeddingModeLabel = computed(() => {
  const mode = model.value.embedding_mode
  const key = `insights.params.embeddingModeValues.${mode}`
  const translated = t(key)
  return translated === key ? String(mode) : translated
})

function onValueSource(value: InsightParamValueSource) {
  model.value.value_source = value
  if (value === 'dynamic') {
    model.value.binding = 'locked'
    model.value.static_value = ''
    if (!model.value.dynamic_key) {
      const first = dynamicKeyItems.value[0]?.value as DynamicParamKey | undefined
      model.value.dynamic_key = first ?? ''
    }
  } else {
    model.value.dynamic_key = ''
  }
}

function onBinding(value: InsightParamBinding) {
  if (isDynamic.value) {
    model.value.binding = 'locked'
    return
  }
  model.value.binding = value
}
</script>

<template>
  <div class="rounded-lg border border-default bg-elevated p-3 space-y-2">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-medium text-highlighted">
          {{ model.name }}
        </p>
        <p class="text-xs text-dimmed">
          {{ t('insights.params.embeddingMode') }}:
          {{ embeddingModeLabel }}
          <span v-if="model.is_required"> · *</span>
        </p>
      </div>
      <UBadge
        v-if="model.is_required"
        color="neutral"
        variant="subtle"
        size="sm"
        label="*"
      />
    </div>

    <div class="grid gap-2 sm:grid-cols-2">
      <UFormField :label="t('insights.params.valueSource')">
        <USelect
          :model-value="model.value_source"
          :items="valueSourceItems"
          value-key="value"
          class="w-full"
          @update:model-value="onValueSource($event as InsightParamValueSource)"
        />
      </UFormField>

      <UFormField :label="t('insights.params.binding')">
        <UTooltip
          :text="isDynamic ? t('insights.params.dynamicForcesLocked') : undefined"
          :disabled="!isDynamic"
        >
          <USelect
            :model-value="model.binding"
            :items="bindingItems"
            value-key="value"
            class="w-full"
            :disabled="isDynamic"
            @update:model-value="onBinding($event as InsightParamBinding)"
          />
        </UTooltip>
      </UFormField>
    </div>

    <UFormField
      v-if="model.value_source === 'static'"
      :label="t('insights.params.staticValue')"
    >
      <UInput
        v-model="model.static_value"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-else
      :label="t('insights.params.dynamicKey')"
    >
      <USelect
        :model-value="model.dynamic_key || undefined"
        :items="dynamicKeyItems"
        value-key="value"
        class="w-full"
        @update:model-value="model.dynamic_key = ($event as DynamicParamKey | undefined) ?? ''"
      />
    </UFormField>

    <p
      v-if="model.error"
      class="text-xs text-error"
    >
      {{ model.error }}
    </p>
  </div>
</template>
