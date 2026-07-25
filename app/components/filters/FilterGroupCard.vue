<script setup lang="ts">
import type { FilterGroup, FilterSchemaField } from '~/types/filter'
import { isFilterGroup } from '~/types/filter'

defineProps<{
  fields: Array<FilterSchemaField>
}>()

const group = defineModel<FilterGroup>('group', { required: true })

const emit = defineEmits<{
  remove: []
  addCondition: []
  removeCondition: [index: number]
}>()

const { t } = useI18n()

const matchItems = computed(() => [
  { label: t('filters.matchAll'), value: 'and' },
  { label: t('filters.matchAny'), value: 'or' }
])
</script>

<template>
  <div class="rounded-lg border border-default bg-muted/30 p-3">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 text-sm">
        <span class="text-dimmed">{{ $t('filters.groupMatch') }}</span>
        <USelect
          v-model="group.op"
          :items="matchItems"
          value-key="value"
          class="w-28"
          size="sm"
        />
      </div>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        :aria-label="$t('filters.removeGroup')"
        @click="emit('remove')"
      />
    </div>

    <div class="flex flex-col gap-2">
      <template
        v-for="(node, index) in group.conditions"
        :key="index"
      >
        <FiltersFilterConditionRow
          v-if="!isFilterGroup(node)"
          v-model:condition="group.conditions[index]"
          :fields="fields"
          @remove="emit('removeCondition', index)"
        />
      </template>
    </div>

    <UButton
      class="mt-3"
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-lucide-plus"
      :label="$t('filters.addFilterInGroup')"
      @click="emit('addCondition')"
    />
  </div>
</template>
