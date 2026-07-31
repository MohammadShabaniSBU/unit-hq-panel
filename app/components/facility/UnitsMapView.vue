<script setup lang="ts">
import type { ApiSiteMap, ApiUnit, UnitMapHoverDetails } from '~/types/facility'
import { decorateStorageUnitElements } from '~/composables/useUnitsMapView'
import { formatCivilDate } from '~/composables/useCivilDate'
import { formatMoney } from '~/composables/useMoney'

const props = defineProps<{
  siteId: number
  maps: Array<ApiSiteMap>
  unitsByNumber: Map<string, ApiUnit>
  getHoverDetails: (unitNumber: string) => UnitMapHoverDetails
}>()

const { t, locale } = useI18n()
const mapContainerRef = useTemplateRef<HTMLElement>('mapContainer')
const hoveredDetails = ref<UnitMapHoverDetails | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

function decorateMaps() {
  const container = mapContainerRef.value

  if (!container) {
    return
  }

  decorateStorageUnitElements(container, props.unitsByNumber)
  attachHoverListeners(container)
}

function attachHoverListeners(container: HTMLElement) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    group.onmouseenter = (event) => {
      const unitNumber = group.getAttribute('data-unit-number')

      if (!unitNumber) {
        return
      }

      hoveredDetails.value = props.getHoverDetails(unitNumber)
      updateTooltipPosition(event)
    }

    group.onmousemove = (event) => {
      updateTooltipPosition(event)
    }

    group.onmouseleave = () => {
      hoveredDetails.value = null
    }
  }
}

function updateTooltipPosition(event: MouseEvent) {
  tooltipPosition.value = {
    x: event.clientX + 12,
    y: event.clientY + 12
  }
}

function stateLabel(state: UnitMapHoverDetails['state']) {
  if (state === 'unknown') {
    return t('common.emptyValue')
  }

  return t(`units.state.${state}`)
}

function holdTypeLabel(holdType: string | null | undefined) {
  if (!holdType) {
    return t('common.emptyValue')
  }

  return t(`units.holds.types.${holdType}`)
}

watch(
  () => [props.maps, props.unitsByNumber] as const,
  async () => {
    await nextTick()
    decorateMaps()
  },
  { deep: true, immediate: true }
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
      style="max-height: calc(100vh - 320px)"
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
            {{ $t('table.status') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ stateLabel(hoveredDetails.state) }}
          </dd>
        </div>

        <template v-if="hoveredDetails.state === 'occupied'">
          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.tenant') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ hoveredDetails.tenantName || $t('common.emptyValue') }}
            </dd>
          </div>

          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.since') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ formatCivilDate(hoveredDetails.contractStartedOn, locale) }}
            </dd>
          </div>

          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.rent') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ formatMoney(hoveredDetails.rentAmount, hoveredDetails.rentCurrency, locale) }}
            </dd>
          </div>
        </template>

        <template v-else-if="hoveredDetails.holdType">
          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.holdType') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ holdTypeLabel(hoveredDetails.holdType) }}
            </dd>
          </div>

          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.holdEnds') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{
                hoveredDetails.holdEndsOn
                  ? formatCivilDate(hoveredDetails.holdEndsOn, locale)
                  : $t('units.holds.indefinite')
              }}
            </dd>
          </div>
        </template>

        <div
          v-else
          class="flex justify-between gap-4"
        >
          <dt class="text-dimmed">
            {{ $t('pages.units.mapCurrentPrice') }}
          </dt>
          <dd class="text-right text-highlighted">
            {{ hoveredDetails.price }}
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
}

:deep(.units-map-unit:hover rect.unit),
:deep(.units-map-unit:hover rect) {
  opacity: 0.85;
  stroke: #111827;
  stroke-width: 1.5;
}
</style>
