<script setup lang="ts">
import type { AutomationNodeType } from '~/types/automation'
import { NODE_TYPE_DEFINITIONS, TRIGGER_NODE_TYPES, ACTION_NODE_TYPES, LOGIC_NODE_TYPES } from '~/types/automation'

const emit = defineEmits<{
  'drag-start': [type: AutomationNodeType]
}>()

const triggersOpen = ref(true)
const actionsOpen = ref(true)
const logicOpen = ref(true)

const triggerDefs = TRIGGER_NODE_TYPES.map(t => NODE_TYPE_DEFINITIONS[t])
const actionDefs = ACTION_NODE_TYPES.map(t => NODE_TYPE_DEFINITIONS[t])
const logicDefs = LOGIC_NODE_TYPES.map(t => NODE_TYPE_DEFINITIONS[t])

function onDragStart(event: DragEvent, type: AutomationNodeType) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/automation-node-type', type)
  event.dataTransfer.effectAllowed = 'move'
  emit('drag-start', type)
}
</script>

<template>
  <div class="flex flex-col gap-4 p-3">
    <!-- Triggers section -->
    <div>
      <button
        class="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-dimmed hover:text-highlighted"
        @click="triggersOpen = !triggersOpen"
      >
        <span>{{ $t('automations.palette.triggers') }}</span>
        <UIcon
          :name="triggersOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5"
        />
      </button>

      <div
        v-show="triggersOpen"
        class="space-y-1.5"
      >
        <div
          v-for="def in triggerDefs"
          :key="def.type"
          draggable="true"
          class="palette-card palette-card--trigger"
          :title="def.description"
          @dragstart="onDragStart($event, def.type)"
        >
          <div class="palette-card__icon palette-card__icon--trigger">
            <UIcon
              :name="def.icon"
              class="size-4"
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
        </div>
      </div>
    </div>

    <div class="h-px bg-default" />

    <!-- Actions section -->
    <div>
      <button
        class="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-dimmed hover:text-highlighted"
        @click="actionsOpen = !actionsOpen"
      >
        <span>{{ $t('automations.palette.actions') }}</span>
        <UIcon
          :name="actionsOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5"
        />
      </button>

      <div
        v-show="actionsOpen"
        class="space-y-1.5"
      >
        <div
          v-for="def in actionDefs"
          :key="def.type"
          draggable="true"
          class="palette-card palette-card--action"
          :title="def.description"
          @dragstart="onDragStart($event, def.type)"
        >
          <div class="palette-card__icon palette-card__icon--action">
            <UIcon
              :name="def.icon"
              class="size-4"
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
        </div>
      </div>
    </div>

    <div class="h-px bg-default" />

    <!-- Logic section -->
    <div>
      <button
        class="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-dimmed hover:text-highlighted"
        @click="logicOpen = !logicOpen"
      >
        <span>{{ $t('automations.palette.logic') }}</span>
        <UIcon
          :name="logicOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5"
        />
      </button>

      <div
        v-show="logicOpen"
        class="space-y-1.5"
      >
        <div
          v-for="def in logicDefs"
          :key="def.type"
          draggable="true"
          class="palette-card palette-card--logic"
          :title="def.description"
          @dragstart="onDragStart($event, def.type)"
        >
          <div class="palette-card__icon palette-card__icon--logic">
            <UIcon
              :name="def.icon"
              class="size-4"
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
        </div>
      </div>
    </div>

    <div class="mt-auto pt-4">
      <p class="text-center text-[10px] text-dimmed">
        {{ $t('automations.palette.dragHint') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.palette-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  cursor: grab;
  transition: border-color 0.15s, box-shadow 0.15s;
  user-select: none;
}

.palette-card:hover {
  box-shadow: 0 2px 8px 0 rgb(0 0 0 / 0.08);
}

.palette-card:active {
  cursor: grabbing;
}

.palette-card--trigger:hover {
  border-color: rgb(124 58 237 / 0.5);
}

.palette-card--action:hover {
  border-color: rgb(5 150 105 / 0.5);
}

.palette-card--logic:hover {
  border-color: rgb(217 119 6 / 0.5);
}

.palette-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  shrink: 0;
  flex-shrink: 0;
}

.palette-card__icon--trigger {
  background: rgb(124 58 237 / 0.1);
  color: #7c3aed;
}

.palette-card__icon--action {
  background: rgb(5 150 105 / 0.1);
  color: #059669;
}

.palette-card__icon--logic {
  background: rgb(217 119 6 / 0.1);
  color: #d97706;
}
</style>
