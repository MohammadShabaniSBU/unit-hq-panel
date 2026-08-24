<script setup lang="ts">
import type { ApiUnit } from '~/types/facility'
import type { FloorMapItem, FloorMapMatchBuckets } from '~/types/floorMapBuilder'

const props = defineProps<{
  item: FloorMapItem | null
  units: Array<ApiUnit>
  assignedUnitNumbers: Set<string>
  match: FloorMapMatchBuckets
}>()

const emit = defineEmits<{
  update: [id: string, patch: { x?: number, y?: number, width?: number, height?: number, unit_number?: string | null }]
  placeUnit: [unit: ApiUnit]
  selectUnit: [unitNumber: string]
}>()

const { t } = useI18n()
const unitQuery = ref('')

const x = ref(0)
const y = ref(0)
const width = ref(0)
const height = ref(0)

watch(() => props.item, (item) => {
  if (!item) {
    return
  }

  x.value = round(item.x)
  y.value = round(item.y)
  width.value = round(item.width)
  height.value = round(item.height)
}, { immediate: true, deep: true })

function round(value: number) {
  return Math.round(value * 10) / 10
}

function emitGeometry() {
  if (!props.item) {
    return
  }

  emit('update', props.item.id, {
    x: Number(x.value),
    y: Number(y.value),
    width: Number(width.value),
    height: Number(height.value)
  })
}

const unitSelectItems = computed(() => {
  const selectedNumber = props.item?.type === 'unit' ? props.item.unit_number : null

  return [
    { label: t('pages.settings.mapBuilder.unassigned'), value: '' },
    ...props.units.map(unit => ({
      label: unit.unit_number,
      value: unit.unit_number,
      disabled: props.assignedUnitNumbers.has(unit.unit_number) && unit.unit_number !== selectedNumber
    }))
  ]
})

const assignedValue = computed(() => {
  if (props.item?.type !== 'unit') {
    return ''
  }

  return props.item.unit_number ?? ''
})

function onAssign(value: string | undefined | null) {
  if (!props.item || props.item.type !== 'unit') {
    return
  }

  const next = value ? String(value) : null
  emit('update', props.item.id, { unit_number: next })
}

const filteredUnits = computed(() => {
  const query = unitQuery.value.trim().toLowerCase()

  return props.units.filter((unit) => {
    if (!query) {
      return true
    }

    return unit.unit_number.toLowerCase().includes(query)
      || (unit.unit_class?.code ?? '').toLowerCase().includes(query)
  })
})

function bucketText(ids: Array<string>) {
  if (!ids.length) {
    return t('common.emptyValue')
  }

  const preview = ids.slice(0, 8)
  const extra = ids.length - preview.length

  if (extra <= 0) {
    return preview.join(', ')
  }

  return `${preview.join(', ')} +${extra}`
}

function onUnitRowClick(unit: ApiUnit) {
  if (props.assignedUnitNumbers.has(unit.unit_number)) {
    emit('selectUnit', unit.unit_number)
    return
  }

  emit('placeUnit', unit)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <div
        v-if="!item"
        class="text-sm text-muted"
      >
        {{ $t('pages.settings.mapBuilder.inspectorEmpty') }}
      </div>

      <div
        v-else
        class="flex flex-col gap-3"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
          {{ item.type === 'unit'
            ? $t('pages.settings.mapBuilder.inspectorUnit')
            : $t('pages.settings.mapBuilder.inspectorEntrance') }}
        </p>

        <div class="grid grid-cols-2 gap-2">
          <UFormField :label="$t('pages.settings.mapBuilder.x')">
            <UInput
              v-model.number="x"
              type="number"
              size="sm"
              @change="emitGeometry"
            />
          </UFormField>
          <UFormField :label="$t('pages.settings.mapBuilder.y')">
            <UInput
              v-model.number="y"
              type="number"
              size="sm"
              @change="emitGeometry"
            />
          </UFormField>
          <UFormField :label="$t('pages.settings.mapBuilder.width')">
            <UInput
              v-model.number="width"
              type="number"
              min="24"
              size="sm"
              @change="emitGeometry"
            />
          </UFormField>
          <UFormField :label="$t('pages.settings.mapBuilder.height')">
            <UInput
              v-model.number="height"
              type="number"
              min="24"
              size="sm"
              @change="emitGeometry"
            />
          </UFormField>
        </div>

        <UFormField
          v-if="item.type === 'unit'"
          :label="$t('pages.settings.mapBuilder.assignUnit')"
        >
          <USelectMenu
            :model-value="assignedValue"
            :items="unitSelectItems"
            value-key="value"
            searchable
            class="w-full"
            @update:model-value="onAssign"
          />
        </UFormField>
      </div>

      <div class="mt-6 flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
          {{ $t('pages.settings.mapBuilder.unitsTitle') }}
        </p>
        <UInput
          v-model="unitQuery"
          :placeholder="$t('pages.settings.mapBuilder.unitsSearch')"
          icon="i-lucide-search"
          size="sm"
        />
        <p
          v-if="!filteredUnits.length"
          class="text-xs text-muted"
        >
          {{ $t('pages.settings.mapBuilder.unitsEmpty') }}
        </p>
        <ul
          v-else
          class="divide-y divide-default rounded-lg border border-default"
        >
          <li
            v-for="unit in filteredUnits"
            :key="unit.id"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-elevated/60"
              @click="onUnitRowClick(unit)"
            >
              <span class="truncate text-highlighted">{{ unit.unit_number }}</span>
              <UBadge
                v-if="assignedUnitNumbers.has(unit.unit_number)"
                :label="$t('pages.settings.mapBuilder.onThisFloor')"
                color="success"
                variant="subtle"
                size="xs"
              />
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="shrink-0 border-t border-default p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-dimmed">
        {{ $t('pages.settings.mapBuilder.matchTitle') }}
      </p>
      <div class="mt-2 grid gap-2 text-xs">
        <p class="break-words">
          <span class="text-dimmed">{{ $t('pages.settings.mapBuilder.matched') }}</span>
          ({{ match.matched.length }})
          <span class="mt-0.5 block text-highlighted">{{ bucketText(match.matched) }}</span>
        </p>
        <p class="break-words">
          <span class="text-dimmed">{{ $t('pages.settings.mapBuilder.orphanShapes') }}</span>
          ({{ match.orphan_shapes.length }})
          <span class="mt-0.5 block text-warning">{{ bucketText(match.orphan_shapes) }}</span>
        </p>
        <p class="break-words">
          <span class="text-dimmed">{{ $t('pages.settings.mapBuilder.uncoveredUnits') }}</span>
          ({{ match.uncovered_units.length }})
          <span class="mt-0.5 block max-h-16 overflow-y-auto text-warning">{{ bucketText(match.uncovered_units) }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
