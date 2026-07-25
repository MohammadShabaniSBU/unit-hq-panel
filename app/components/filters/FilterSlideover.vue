<script setup lang="ts">
import type { FilterEntityType, FilterGroup, FilterSchemaField } from '~/types/filter'
import { isFilterGroup } from '~/types/filter'

defineProps<{
  entityType: FilterEntityType
  fields: Array<FilterSchemaField>
  pending?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const workingFilter = defineModel<FilterGroup | null>('workingFilter', { required: true })

const emit = defineEmits<{
  'apply': []
  'cancel': []
  'clear': []
  'add-condition': []
  'add-group': []
  'add-condition-in-group': [group: FilterGroup]
  'remove-root': [index: number]
  'remove-in-group': [group: FilterGroup, index: number]
  'update:root-op': [op: 'and' | 'or']
}>()

const { t } = useI18n()

const matchItems = computed(() => [
  { label: t('filters.matchAll'), value: 'and' },
  { label: t('filters.matchAny'), value: 'or' }
])

const hasConditions = computed(() => (workingFilter.value?.conditions.length ?? 0) > 0)
const showMatchToggle = computed(() => (workingFilter.value?.conditions.length ?? 0) >= 2)

const rootConditions = computed(() => workingFilter.value?.conditions ?? [])
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="$t('filters.title')"
    :ui="{ content: 'max-w-md w-full' }"
    @update:open="(value) => { if (!value) emit('cancel') }"
  >
    <template #body>
      <div
        v-if="pending"
        class="flex items-center justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <div
          v-if="!hasConditions"
          class="flex flex-col items-start gap-3"
        >
          <p class="text-sm text-dimmed">
            {{ $t('filters.emptyHint') }}
          </p>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            :label="$t('filters.addFilter')"
            @click="emit('add-condition')"
          />
        </div>

        <div
          v-else
          class="flex flex-col gap-3"
        >
          <div
            v-if="showMatchToggle && workingFilter"
            class="flex items-center gap-2 text-sm"
          >
            <span>{{ $t('filters.match') }}</span>
            <USelect
              :model-value="workingFilter.op"
              :items="matchItems"
              value-key="value"
              class="w-28"
              size="sm"
              @update:model-value="(value) => emit('update:root-op', value as 'and' | 'or')"
            />
            <span class="text-dimmed">{{ $t('filters.ofTheFollowing') }}</span>
          </div>

          <template
            v-for="(node, index) in rootConditions"
            :key="index"
          >
            <FiltersFilterConditionRow
              v-if="!isFilterGroup(node) && workingFilter"
              v-model:condition="workingFilter.conditions[index]"
              :fields="fields"
              @remove="emit('remove-root', index)"
            />
            <FiltersFilterGroupCard
              v-else-if="isFilterGroup(node)"
              v-model:group="workingFilter!.conditions[index]"
              :fields="fields"
              @remove="emit('remove-root', index)"
              @add-condition="emit('add-condition-in-group', node)"
              @remove-condition="(conditionIndex) => emit('remove-in-group', node, conditionIndex)"
            />
          </template>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-plus"
              :label="$t('filters.addFilter')"
              @click="emit('add-condition')"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-folder-plus"
              :label="$t('filters.addGroup')"
              @click="emit('add-group')"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 border-t border-default pt-4">
          <!-- Reserved for future "Save this filter" -->
          <div class="min-w-24">
            <UButton
              v-if="hasConditions"
              color="neutral"
              variant="ghost"
              :label="$t('filters.clearAll')"
              @click="emit('clear')"
            />
          </div>
          <div class="flex gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :label="$t('common.cancel')"
              @click="emit('cancel')"
            />
            <UButton
              color="primary"
              :label="$t('filters.apply')"
              @click="emit('apply')"
            />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
