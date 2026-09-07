import { computed, ref, toValue, watch } from 'vue'
import type {
  ApiSiteMap,
  ApiUnit,
  ApiUnitClassPriceMatrix,
  ApiUnitClassPriceMatrixCell,
  UnitMapHoverDetails,
  UnitMapShapeMatch
} from '~/types/facility'
import type { UnitState } from '~/types/unit'
import { formatUnitClass, formatUnitDimensions } from '~/utils/formatUnit'
import { formatUnitClassPriceCell } from '~/composables/useUnitClassPriceMatrix'
import { formatMoney } from '~/composables/useMoney'
import { unitStateFillColors } from '~/composables/useUnitState'
import { useSiteMap, useSiteMaps } from '~/composables/useSiteMaps'

export { unitStateFillColors as unitMapStatusFillColors }

const ORPHAN_FILL = '#d1d5db'

export function formatUnitMapPrice(
  price: ApiUnitClassPriceMatrixCell | undefined,
  t: (key: string) => string,
  emptyValue: string
) {
  return formatUnitClassPriceCell(price, t, emptyValue)
}

export function buildUnitMapHoverDetails(
  unit: ApiUnit | undefined,
  price: ApiUnitClassPriceMatrixCell | undefined,
  t: (key: string) => string,
  emptyValue: string,
  locale: string = 'en'
): UnitMapHoverDetails {
  if (!unit) {
    return {
      unitNumber: emptyValue,
      unitClass: emptyValue,
      dimensions: emptyValue,
      price: emptyValue,
      state: 'unknown'
    }
  }

  const state = unit.state ?? 'unknown'
  const classPrice = formatUnitMapPrice(price, t, emptyValue)

  let displayPrice = classPrice
  if (unit.state === 'occupied') {
    displayPrice = formatMoney(unit.amount, unit.currency, locale)
  }

  return {
    unitNumber: unit.unit_number,
    unitClass: formatUnitClass(unit),
    dimensions: formatUnitDimensions(unit),
    price: displayPrice,
    state,
    tenantName: unit.tenant_name ?? null,
    contractId: unit.contract_id ?? null,
    contractStartedOn: unit.current_occupancy?.started_on ?? null,
    rentAmount: unit.amount ?? null,
    rentCurrency: unit.currency ?? null,
    holdType: unit.current_hold?.hold_type ?? null,
    holdEndsOn: unit.current_hold?.ends_on ?? null,
    isOverdue: Boolean(unit.is_overdue),
    isOverlocked: Boolean(unit.overlock?.active)
  }
}

/** Parse stored SVG and append the root <svg> into the container (never v-html). */
export function injectSiteMapSvg(container: HTMLElement, svgMap: string | null | undefined): SVGSVGElement | null {
  container.replaceChildren()

  if (!svgMap?.trim()) {
    return null
  }

  const parsed = new DOMParser().parseFromString(svgMap, 'image/svg+xml')
  const parseError = parsed.querySelector('parsererror')
  if (parseError) {
    return null
  }

  const svg = parsed.documentElement
  if (svg.tagName.toLowerCase() !== 'svg') {
    return null
  }

  const imported = document.importNode(svg, true)
  if (!(imported instanceof SVGSVGElement)) {
    return null
  }

  imported.classList.add('units-map-svg-root')
  imported.setAttribute('width', '100%')
  imported.setAttribute('height', 'auto')
  imported.style.maxWidth = '100%'
  imported.style.height = 'auto'
  imported.style.display = 'block'

  container.appendChild(imported)
  return imported
}

export function matchSiteMapShapes(
  container: HTMLElement,
  unitsByNumber: Map<string, ApiUnit>
): UnitMapShapeMatch {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')
  const shapeRefs: Array<string> = []
  const matched: Array<string> = []
  const orphanShapes: Array<string> = []

  for (const group of unitGroups) {
    const unitNumber = group.getAttribute('data-unit-number')?.trim()
    if (!unitNumber) {
      continue
    }

    shapeRefs.push(unitNumber)

    if (unitsByNumber.has(unitNumber)) {
      matched.push(unitNumber)
    } else {
      orphanShapes.push(unitNumber)
    }
  }

  return {
    matched,
    orphanShapes,
    // Floor-scoped uncovered is unknown without the site's other maps.
    uncoveredUnits: [],
    shapeCount: shapeRefs.length
  }
}

export function decorateStorageUnitElements(
  container: HTMLElement,
  unitsByNumber: Map<string, ApiUnit>
) {
  ensureOverlayDefs(container)

  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    const unitNumber = group.getAttribute('data-unit-number')?.trim()

    if (!unitNumber) {
      continue
    }

    const unit = unitsByNumber.get(unitNumber)
    const rect = group.querySelector<SVGRectElement>('rect.unit, rect')

    group.removeAttribute('data-status')
    group.removeAttribute('data-overdue')
    group.removeAttribute('data-overlock')
    group.removeAttribute('data-map-state')

    const staleClasses = Array.from(group.classList)
      .filter(className => className.startsWith('units-map-unit--') || className === 'units-map-unit' || className === 'units-map-orphan')

    if (staleClasses.length) {
      group.classList.remove(...staleClasses)
    }

    if (!unit) {
      group.classList.add('units-map-orphan')
      group.setAttribute('data-orphan', '1')
      group.style.cursor = 'default'
      group.style.pointerEvents = 'none'

      if (rect) {
        rect.setAttribute('fill', 'url(#units-map-orphan-hatch)')
        rect.style.setProperty('fill', 'url(#units-map-orphan-hatch)', 'important')
        rect.style.cursor = 'default'
        rect.style.removeProperty('stroke')
        rect.style.removeProperty('stroke-width')
        rect.style.removeProperty('stroke-dasharray')
      }

      continue
    }

    const state: UnitState | 'unknown' = unit.state ?? 'unknown'
    const fillColor = unitStateFillColors[state]

    group.setAttribute('data-status', state)
    group.setAttribute('data-map-state', state)
    group.classList.add('units-map-unit', `units-map-unit--${state}`)
    group.style.cursor = 'pointer'
    group.style.pointerEvents = ''
    group.removeAttribute('data-orphan')

    if (unit.is_overdue) {
      group.setAttribute('data-overdue', '1')
    }

    if (unit.overlock?.active) {
      group.setAttribute('data-overlock', '1')
    }

    if (rect) {
      rect.setAttribute('fill', fillColor)
      rect.style.setProperty('fill', fillColor, 'important')
      rect.style.cursor = 'pointer'
      applyOverlayStrokes(rect, Boolean(unit.is_overdue), Boolean(unit.overlock?.active))
    }
  }
}

function ensureOverlayDefs(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) {
    return
  }

  let defs = svg.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.insertBefore(defs, svg.firstChild)
  }

  if (!defs.querySelector('#units-map-orphan-hatch')) {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.setAttribute('id', 'units-map-orphan-hatch')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    pattern.setAttribute('width', '6')
    pattern.setAttribute('height', '6')

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', '6')
    bg.setAttribute('height', '6')
    bg.setAttribute('fill', ORPHAN_FILL)
    pattern.appendChild(bg)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    line.setAttribute('d', 'M0,6 L6,0')
    line.setAttribute('stroke', '#9ca3af')
    line.setAttribute('stroke-width', '1')
    pattern.appendChild(line)

    defs.appendChild(pattern)
  }
}

function applyOverlayStrokes(
  rect: SVGRectElement,
  isOverdue: boolean,
  isOverlocked: boolean
) {
  rect.classList.remove('units-map-overdue', 'units-map-overlock')

  if (isOverdue) {
    rect.classList.add('units-map-overdue')
  }

  if (isOverlocked) {
    rect.classList.add('units-map-overlock')
  }

  // Base overlay strokes — selection layer may override stroke later.
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

export function useUnitsMapView(siteId: MaybeRefOrGetter<number | undefined>) {
  const { get } = useApi()
  const { t, locale } = useI18n()
  const id = computed(() => toValue(siteId))
  const emptyValue = computed(() => t('common.emptyValue'))

  const selectedMapId = ref<number | undefined>(undefined)

  const {
    maps: floorMaps,
    pending: floorsPending,
    error: floorsError,
    refresh: refreshFloors
  } = useSiteMaps(id)

  const {
    siteMap: selectedFloor,
    pending: floorSvgPending,
    error: floorSvgError,
    refresh: refreshFloorSvg
  } = useSiteMap(selectedMapId)

  const {
    data: unitsData,
    pending: unitsPending,
    error: unitsError,
    refresh: refreshUnits
  } = useAsyncData(
    () => `units-map-${id.value ?? 'none'}`,
    async () => {
      if (!id.value) {
        return [] as Array<ApiUnit>
      }

      const response = await get<Array<ApiUnit>>('/api/units', {
        site_id: id.value,
        for_map: 1
      })
      return response.data
    },
    { watch: [id], immediate: false }
  )

  const {
    data: priceMatrixData,
    pending: pricePending,
    error: priceError,
    refresh: refreshPrices
  } = useAsyncData(
    'unit-class-price-matrix-map',
    () => get<ApiUnitClassPriceMatrix>('/api/unit-class-price-matrix')
  )

  const maps = computed(() => floorMaps.value)
  const activeMap = computed<ApiSiteMap | null>(() => selectedFloor.value)
  const units = computed(() => unitsData.value ?? [])

  const unitsByNumber = computed(() => {
    const lookup = new Map<string, ApiUnit>()

    for (const unit of units.value) {
      lookup.set(unit.unit_number, unit)
    }

    return lookup
  })

  const priceByUnitClassId = computed(() => {
    const lookup = new Map<number, ApiUnitClassPriceMatrixCell>()
    const siteIdValue = id.value
    const matrix = priceMatrixData.value?.data

    if (!siteIdValue || !matrix) {
      return lookup
    }

    for (const row of matrix.rows) {
      const price = row.prices[String(siteIdValue)]

      if (price) {
        lookup.set(row.unit_class_id, price)
      }
    }

    return lookup
  })

  const pending = computed(
    () => floorsPending.value || unitsPending.value || pricePending.value || floorSvgPending.value
  )
  const error = computed(
    () => floorsError.value ?? unitsError.value ?? priceError.value ?? floorSvgError.value ?? null
  )

  watch(
    maps,
    (list) => {
      if (!list.length) {
        selectedMapId.value = undefined
        return
      }

      const stillValid = list.some(m => m.id === selectedMapId.value)
      if (!stillValid) {
        selectedMapId.value = list[0]?.id
      }
    },
    { immediate: true }
  )

  async function refresh() {
    if (!id.value) {
      return
    }

    await Promise.all([
      refreshFloors(),
      refreshUnits(),
      refreshPrices()
    ])

    if (selectedMapId.value) {
      await refreshFloorSvg()
    }
  }

  watch(id, (siteIdValue) => {
    selectedMapId.value = undefined
    if (siteIdValue) {
      refresh()
    }
  })

  function getHoverDetails(unitNumber: string): UnitMapHoverDetails {
    const unit = unitsByNumber.value.get(unitNumber)
    const price = unit ? priceByUnitClassId.value.get(unit.unit_class_id) : undefined

    return buildUnitMapHoverDetails(unit, price, t, emptyValue.value, locale.value)
  }

  function selectMap(mapId: number) {
    selectedMapId.value = mapId
  }

  return {
    maps,
    activeMap,
    selectedMapId,
    selectMap,
    units,
    unitsByNumber,
    priceByUnitClassId,
    pending,
    error,
    refresh,
    getHoverDetails,
    emptyValue
  }
}

/** Stamp the offered unit so the floor plan can highlight it without occupancy colours. */
export function highlightOfferMapUnit(container: HTMLElement, unitNumber: string): boolean {
  const target = unitNumber.trim()
  if (!target) {
    return false
  }

  const hasDataRefs = container.querySelector('[data-unit-number]') !== null
  const candidates = hasDataRefs
    ? container.querySelectorAll<SVGElement>('[data-unit-number]')
    : container.querySelectorAll<SVGElement>('[id]')

  let focused: SVGElement | null = null

  for (const element of candidates) {
    const ref = hasDataRefs
      ? element.getAttribute('data-unit-number')?.trim()
      : element.getAttribute('id')?.trim()

    if (ref === target) {
      element.setAttribute('data-offer-focus', '1')
      focused = element
    } else {
      element.removeAttribute('data-offer-focus')
    }
  }

  focused?.scrollIntoView({ block: 'nearest', inline: 'nearest' })

  return focused !== null
}
