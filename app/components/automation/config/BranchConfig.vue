<script setup lang="ts">
import { nanoid } from 'nanoid'
import type { BranchArm, BranchLogicConfig, FilterGroup } from '~/types/automation'

const props = defineProps<{
  config: BranchLogicConfig
  objectType?: string
}>()

const emit = defineEmits<{
  'update:config': [config: BranchLogicConfig]
  'remove-arm': [armId: string]
}>()

function defaultFilters(): FilterGroup {
  return { logic: 'and', conditions: [] }
}

function emitArms(arms: Array<BranchArm>) {
  emit('update:config', { ...props.config, arms })
}

function addArm() {
  emitArms([
    ...props.config.arms,
    { id: nanoid(8), label: '', filters: defaultFilters() }
  ])
}

function removeArm(armId: string) {
  if (props.config.arms.length <= 1) {
    return
  }
  emit('remove-arm', armId)
}

function updateArm(armId: string, patch: Partial<BranchArm>) {
  emitArms(props.config.arms.map(arm =>
    arm.id === armId ? { ...arm, ...patch } : arm
  ))
}

function moveArm(index: number, direction: -1 | 1) {
  const next = index + direction
  if (next < 0 || next >= props.config.arms.length) {
    return
  }
  const arms = [...props.config.arms]
  const current = arms[index]
  const swap = arms[next]
  if (!current || !swap) {
    return
  }
  arms[index] = swap
  arms[next] = current
  emitArms(arms)
}

function isDefaultArm(arm: BranchArm) {
  return arm.filters.conditions.length === 0
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-dimmed">
      {{ $t('automations.config.branch.evalOrderHint') }}
    </p>

    <div class="space-y-3">
      <div
        v-for="(arm, index) in config.arms"
        :key="arm.id"
        class="rounded-lg border border-default p-3"
      >
        <div class="mb-3 flex items-center gap-2">
          <div class="flex flex-col">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-up"
              :disabled="index === 0"
              :aria-label="$t('automations.config.branch.moveUp')"
              @click="moveArm(index, -1)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-down"
              :disabled="index === config.arms.length - 1"
              :aria-label="$t('automations.config.branch.moveDown')"
              @click="moveArm(index, 1)"
            />
          </div>
          <UFormField
            :label="$t('automations.config.branch.armLabel')"
            class="min-w-0 flex-1"
          >
            <UInput
              :model-value="arm.label"
              :placeholder="$t('automations.config.branch.armLabelPlaceholder')"
              class="w-full"
              size="sm"
              @update:model-value="updateArm(arm.id, { label: $event })"
            />
          </UFormField>
          <UButton
            v-if="config.arms.length > 1"
            size="xs"
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            :aria-label="$t('automations.config.branch.removeArm')"
            @click="removeArm(arm.id)"
          />
        </div>

        <p
          v-if="isDefaultArm(arm)"
          class="mb-2 text-xs text-dimmed"
        >
          {{ $t('automations.config.branch.defaultArm') }}
        </p>

        <AutomationConfigFilterGroupEditor
          :group="arm.filters"
          :object-type="objectType"
          @update:group="updateArm(arm.id, { filters: $event })"
        />
      </div>
    </div>

    <UButton
      size="sm"
      variant="outline"
      color="neutral"
      icon="i-lucide-plus"
      :label="$t('automations.config.branch.addArm')"
      block
      @click="addArm"
    />
  </div>
</template>
