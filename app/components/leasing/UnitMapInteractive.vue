<script setup lang="ts">
import type { ApiSiteMap, ApiUnit, UnitMapHoverDetails, UnitMapShapeMatch } from '~/types/facility'
import {
  decorateStorageUnitElements,
  injectSiteMapSvg,
  matchSiteMapShapes
} from '~/composables/useUnitsMapView'
import { formatCivilDate } from '~/composables/useCivilDate'
import { formatMoney } from '~/composables/useMoney'

const props = defineProps<{
  siteId: number
  siteMap: ApiSiteMap | null
  unitsByNumber: Map<string, ApiUnit>
  getHoverDetails: (unitNumber: string) => UnitMapHoverDetails
  mode: 'normal' | 'offer'
  selectedUnitNumbers?: Set<string>
  clickedUnitNumber?: string | null
}>()

const emit = defineEmits<{
  unitClick: [unitNumber: string]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const svgHostRef = useTemplateRef<HTMLElement>('svgHost')
const hoveredDetails = ref<UnitMapHoverDetails | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })
const shapeMatch = ref<UnitMapShapeMatch | null>(null)

const isTotalMismatch = computed(() => {
  const match = shapeMatch.value
  if (!match || match.shapeCount === 0) {
    return false
  }

  return match.matched.length === 0
})

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

function decorateMaps() {
  const host = svgHostRef.value
  if (!host) {
    return
  }

  injectSiteMapSvg(host, props.siteMap?.svg_map)
  shapeMatch.value = matchSiteMapShapes(host, props.unitsByNumber)

  if (isTotalMismatch.value) {
    return
  }

  decorateStorageUnitElements(host, props.unitsByNumber)
  applySelectionStyles(host)
  attachListeners(host)
}

function applySelectionStyles(container: HTMLElement) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    if (group.hasAttribute('data-orphan')) {
      continue
    }

    const unitNumber = group.getAttribute('data-unit-number')
    if (!unitNumber) {
      continue
    }

    const rect = group.querySelector<SVGRectElement>('rect.unit, rect')
    if (!rect) {
      continue
    }

    const isSelected = props.selectedUnitNumbers?.has(unitNumber) ?? false
    const isClicked = props.clickedUnitNumber === unitNumber

    if (isSelected || isClicked) {
      rect.classList.add('units-map-selected')
      rect.style.setProperty('stroke', '#dc2626', 'important')
      rect.style.setProperty('stroke-width', '2.5', 'important')
      rect.style.setProperty('stroke-dasharray', 'none', 'important')
    } else {
      rect.classList.remove('units-map-selected')
      // Re-apply overlay strokes from decoration attributes
      const isOverdue = group.getAttribute('data-overdue') === '1'
      const isOverlocked = group.getAttribute('data-overlock') === '1'

      if (isOverlocked && isOverdue) {
        rect.style.setProperty('stroke', '#b45309', 'important')
        rect.style.setProperty('stroke-width', '2.5', 'important')
        rect.style.setProperty('stroke-dasharray', '4 2', 'important')
      } else if (isOverlocked) {
        rect.style.setProperty('stroke', '#7c3aed', 'important')
        rect.style.setProperty('stroke-width', '2.5', 'important')
        rect.style.setProperty('stroke-dasharray', '3 2', 'important')
      } else if (isOverdue) {
        rect.style.setProperty('stroke', '#dc2626', 'important')
        rect.style.setProperty('stroke-width', '2', 'important')
        rect.style.setProperty('stroke-dasharray', 'none', 'important')
      } else {
        rect.style.removeProperty('stroke')
        rect.style.removeProperty('stroke-width')
        rect.style.removeProperty('stroke-dasharray')
      }
    }
  }
}

function attachListeners(container: HTMLElement) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    if (group.hasAttribute('data-orphan')) {
      group.onmouseenter = null
      group.onmousemove = null
      group.onmouseleave = null
      group.onclick = null
      continue
    }

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

    group.onclick = () => {
      const unitNumber = group.getAttribute('data-unit-number')
      if (!unitNumber) {
        return
      }
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
  () => [props.siteMap, props.unitsByNumber] as const,
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
    const host = svgHostRef.value
    if (!host || isTotalMismatch.value) {
      return
    }
    applySelectionStyles(host)
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
      v-if="!siteMap?.svg_map"
      class="px-4 py-8 text-center text-sm text-dimmed"
    >
      {{ $t('pages.units.mapNoSvg') }}
    </div>

    <template v-else>
      <div
        v-if="isTotalMismatch && shapeMatch"
        class="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ $t('units.map.mismatchTitle') }}
        </p>
        <p class="max-w-md text-sm text-dimmed">
          {{ $t('units.map.mismatchBody', {
            matched: shapeMatch.matched.length,
            orphans: shapeMatch.orphanShapes.length
          }) }}
        </p>
      </div>

      <!-- Keep host mounted (v-show) so floor switches can re-inject SVG. -->
      <div
        v-show="!isTotalMismatch"
        class="overflow-auto p-4"
      >
        <div
          ref="svgHost"
          class="units-map-svg w-full"
        />
      </div>
    </template>

    <div
      v-if="hoveredDetails && !isTotalMismatch"
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

          <div
            v-if="hoveredDetails.contractId"
            class="flex justify-between gap-4"
          >
            <dt class="text-dimmed">
              {{ $t('units.map.contract') }}
            </dt>
            <dd class="pointer-events-auto text-right">
              <NuxtLink
                :to="localePath(`/leasing/contracts/${hoveredDetails.contractId}`)"
                class="text-primary hover:underline"
              >
                {{ $t('units.map.viewContract') }}
              </NuxtLink>
            </dd>
          </div>

          <div class="flex justify-between gap-4">
            <dt class="text-dimmed">
              {{ $t('units.map.since') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ formatCivilDate(hoveredDetails.contractStartedOn) }}
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

          <div
            v-if="hoveredDetails.isOverdue"
            class="flex justify-between gap-4"
          >
            <dt class="text-dimmed">
              {{ $t('units.map.overdue') }}
            </dt>
            <dd class="text-right text-error">
              {{ $t('units.map.overdueYes') }}
            </dd>
          </div>

          <div
            v-if="hoveredDetails.isOverlocked"
            class="flex justify-between gap-4"
          >
            <dt class="text-dimmed">
              {{ $t('units.map.overlock') }}
            </dt>
            <dd class="text-right text-highlighted">
              {{ $t('units.map.overlockYes') }}
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
                  ? formatCivilDate(hoveredDetails.holdEndsOn)
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
  cursor: pointer;
}

:deep(.units-map-unit:hover rect.unit),
:deep(.units-map-unit:hover rect) {
  opacity: 0.85;
}

:deep(.units-map-unit) {
  cursor: pointer;
}

:deep(.units-map-orphan) {
  cursor: default;
  pointer-events: none;
}
</style>
