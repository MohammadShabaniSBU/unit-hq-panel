<script setup lang="ts">
import type { ApiSiteMap } from '~/types/facility'
import { decorateStorageUnitElements } from '~/composables/useUnitsMapView'

const props = defineProps<{
  siteId: number
  maps: Array<ApiSiteMap>
  unitsByNumber: Map<string, import('~/types/facility').ApiUnit>
  getHoverDetails: (unitNumber: string) => import('~/types/facility').UnitMapHoverDetails
  mode: 'normal' | 'offer'
  selectedUnitNumbers?: Set<string>
  clickedUnitNumber?: string | null
}>()

const emit = defineEmits<{
  unitClick: [unitNumber: string]
}>()

const { t } = useI18n()
const mapContainerRef = useTemplateRef<HTMLElement>('mapContainer')
const hoveredDetails = ref<import('~/types/facility').UnitMapHoverDetails | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

function decorateMaps() {
  const container = mapContainerRef.value
  if (!container) return

  decorateStorageUnitElements(container, props.unitsByNumber)
  applySelectionStyles(container)
  attachListeners(container)
}

function applySelectionStyles(container: HTMLElement) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    const unitNumber = group.getAttribute('data-unit-number')
    if (!unitNumber) continue

    const rect = group.querySelector<SVGRectElement>('rect.unit, rect')
    if (!rect) continue

    const isSelected = props.selectedUnitNumbers?.has(unitNumber) ?? false
    const isClicked = props.clickedUnitNumber === unitNumber

    if (isSelected || isClicked) {
      rect.style.setProperty('stroke', '#dc2626', 'important')
      rect.style.setProperty('stroke-width', '2', 'important')
    } else {
      rect.style.removeProperty('stroke')
      rect.style.removeProperty('stroke-width')
    }
  }
}

function attachListeners(container: HTMLElement) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    group.onmouseenter = (event) => {
      const unitNumber = group.getAttribute('data-unit-number')
      if (!unitNumber) return
      hoveredDetails.value = props.getHoverDetails(unitNumber)
      updateTooltipPosition(event)
    }

    group.onmousemove = (event) => {
      updateTooltipPosition(event)
    }

    group.onmouseleave = () => {
      hoveredDetails.value = null
    }

    group.onclick = () => {
      const unitNumber = group.getAttribute('data-unit-number')
      if (!unitNumber) return
      emit('unitClick', unitNumber)
    }
  }
}

function updateTooltipPosition(event: MouseEvent) {
  tooltipPosition.value = {
    x: event.clientX + 12,
    y: event.clientY + 12
  }
}

watch(
  () => [props.maps, props.unitsByNumber] as const,
  async () => {
    await nextTick()
    decorateMaps()
  },
  { deep: true, immediate: true }
)

watch(
  [() => props.selectedUnitNumbers, () => props.clickedUnitNumber],
  async () => {
    await nextTick()
    const container = mapContainerRef.value
    if (!container) return
    applySelectionStyles(container)
  },
  { deep: true }
)

onMounted(() => {
  decorateMaps()
})
</script>

<template>
  <div class="relative">
    <div
      ref="mapContainer"
      class="flex flex-col gap-8 overflow-auto p-4"
    >
      <section
        v-for="siteMap in maps"
        :key="siteMap.id"
        class="rounded-lg border border-default bg-default"
      >
        <div class="border-b border-default px-4 py-3">
          <h3 class="text-sm font-medium text-highlighted">
            {{ siteMap.floor_name }}
          </h3>
        </div>

        <div
          v-if="siteMap.svg_map"
          class="overflow-auto p-4"
        >
          <div
            class="units-map-svg inline-block min-w-full"
            v-html="siteMap.svg_map"
          />
        </div>

        <div
          v-else
          class="px-4 py-8 text-center text-sm text-dimmed"
        >
          {{ $t('pages.units.mapNoSvg') }}
        </div>
      </section>
    </div>

    <div
      v-if="hoveredDetails"
      class="pointer-events-none fixed z-50 min-w-52 rounded-lg border border-default bg-default p-3 shadow-lg"
      :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
    >
      <p class="text-sm font-semibold text-highlighted">
        {{ hoveredDetails.unitNumber }}
      </p>

      <dl class="mt-2 space-y-1 text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-dimmed">
            {{ $t('table.class') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ hoveredDetails.unitClass }}
          </dd>
        </div>

        <div class="flex justify-between gap-4">
          <dt class="text-dimmed">
            {{ $t('table.dimensions') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ hoveredDetails.dimensions }}
          </dd>
        </div>

        <div class="flex justify-between gap-4">
          <dt class="text-dimmed">
            {{ $t('pages.units.mapCurrentPrice') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ hoveredDetails.price }}
          </dd>
        </div>

        <div class="flex justify-between gap-4">
          <dt class="text-dimmed">
            {{ $t('table.status') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ $t(`status.unitMap.${hoveredDetails.status}`) }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<style scoped>
:deep(.units-map-unit rect.unit),
:deep(.units-map-unit rect) {
  transition: fill 0.15s ease, opacity 0.15s ease;
  cursor: pointer;
}

:deep(.units-map-unit:hover rect.unit),
:deep(.units-map-unit:hover rect) {
  opacity: 0.85;
  stroke: #111827;
  stroke-width: 1.5;
}

:deep(.units-map-unit) {
  cursor: pointer;
}
</style>
