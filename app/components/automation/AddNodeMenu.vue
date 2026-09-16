<script setup lang="ts">
import type { AutomationNodeType } from '~/types/automation'
import { ACTION_NODE_TYPES, LOGIC_NODE_TYPES, NODE_TYPE_DEFINITIONS } from '~/types/automation'

const emit = defineEmits<{
  select: [type: AutomationNodeType]
}>()

const actionDefs = ACTION_NODE_TYPES.map(type => NODE_TYPE_DEFINITIONS[type])
const logicDefs = LOGIC_NODE_TYPES.map(type => NODE_TYPE_DEFINITIONS[type])
</script>

<template>
  <div class="w-64 p-2">
    <p class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-dimmed">
      {{ $t('automations.editor.addStepActions') }}
    </p>
    <div class="space-y-1">
      <button
        v-for="def in actionDefs"
        :key="def.type"
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated"
        @click="emit('select', def.type)"
      >
        <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
          <UIcon
            :name="def.icon"
            class="size-3.5"
          />
        </div>
        <div class="min-w-0">
          <p class="truncate text-xs font-medium text-highlighted">
            {{ def.label }}
          </p>
          <p class="truncate text-[10px] text-dimmed">
            {{ def.description }}
          </p>
        </div>
      </button>
    </div>

    <div class="my-2 h-px bg-default" />

    <p class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-dimmed">
      {{ $t('automations.editor.addStepLogic') }}
    </p>
    <div class="space-y-1">
      <button
        v-for="def in logicDefs"
        :key="def.type"
        type="button"
        class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-elevated"
        @click="emit('select', def.type)"
      >
        <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
          <UIcon
            :name="def.icon"
            class="size-3.5"
          />
        </div>
        <div class="min-w-0">
          <p class="truncate text-xs font-medium text-highlighted">
            {{ def.label }}
          </p>
          <p class="truncate text-[10px] text-dimmed">
            {{ def.description }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>
