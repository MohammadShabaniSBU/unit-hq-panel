import type {
  ApiSiteMap,
  ApiUnit,
  ApiUnitClassPriceMatrix,
  ApiUnitClassPriceMatrixCell,
  UnitMapHoverDetails,
  UnitMapStatus
} from '~/types/facility'
import { formatUnitClass, formatUnitDimensions } from '~/composables/useUnitsList'
import { formatUnitClassPriceCell } from '~/composables/useUnitClassPriceMatrix'

export const unitMapStatusFillColors: Record<UnitMapStatus | 'unknown', string> = {
  free: '#34d399',
  occupied: '#22c55e',
  reserved: '#fbbf24',
  archived: '#9ca3af',
  unknown: '#d1d5db'
}

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
  emptyValue: string
): UnitMapHoverDetails {
  if (!unit) {
    return {
      unitNumber: emptyValue,
      unitClass: emptyValue,
      dimensions: emptyValue,
      price: emptyValue,
      status: 'unknown'
    }
  }

  return {
    unitNumber: unit.unit_number,
    unitClass: formatUnitClass(unit),
    dimensions: formatUnitDimensions(unit),
    price: formatUnitMapPrice(price, t, emptyValue),
    status: unit.status ?? 'unknown'
  }
}

export function useUnitsMapView(siteId: MaybeRefOrGetter<number | undefined>) {
  const { get } = useApi()
  const { t } = useI18n()
  const id = computed(() => toValue(siteId))
  const emptyValue = computed(() => t('common.emptyValue'))

  const {
    data: mapsData,
    pending: mapsPending,
    error: mapsError,
    refresh: refreshMaps
  } = useAsyncData(
    () => `site-maps-svg-${id.value ?? 'none'}`,
    async () => {
      if (!id.value) {
        return [] as Array<ApiSiteMap>
      }

      const response = await get<Array<ApiSiteMap>>(`/api/sites/${id.value}/maps`, { with_svg: 1 })
      return response.data
    },
    { watch: [id], immediate: false }
  )

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

  const maps = computed(() => mapsData.value ?? [])
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

  const pending = computed(() => mapsPending.value || unitsPending.value || pricePending.value)
  const error = computed(() => mapsError.value ?? unitsError.value ?? priceError.value ?? null)

  async function refresh() {
    if (!id.value) {
      return
    }

    await Promise.all([
      refreshMaps(),
      refreshUnits(),
      refreshPrices()
    ])
  }

  watch(id, (siteIdValue) => {
    if (siteIdValue) {
      refresh()
    }
  })

  function getHoverDetails(unitNumber: string): UnitMapHoverDetails {
    const unit = unitsByNumber.value.get(unitNumber)
    const price = unit ? priceByUnitClassId.value.get(unit.unit_class_id) : undefined

    return buildUnitMapHoverDetails(unit, price, t, emptyValue.value)
  }

  return {
    maps,
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

export function decorateStorageUnitElements(
  container: HTMLElement,
  unitsByNumber: Map<string, ApiUnit>
) {
  const unitGroups = container.querySelectorAll<SVGGElement>('g.storage-unit[data-unit-number]')

  for (const group of unitGroups) {
    const unitNumber = group.getAttribute('data-unit-number')

    if (!unitNumber) {
      continue
    }

    const unit = unitsByNumber.get(unitNumber)
    const status: UnitMapStatus | 'unknown' = unit?.status ?? 'unknown'
    const fillColor = unitMapStatusFillColors[status]

    group.setAttribute('data-map-status', status)
    const staleStatusClasses = Array.from(group.classList)
      .filter(className => className.startsWith('units-map-unit--'))

    if (staleStatusClasses.length) {
      group.classList.remove(...staleStatusClasses)
    }

    group.classList.add('units-map-unit', `units-map-unit--${status}`)

    const rect = group.querySelector<SVGRectElement>('rect.unit, rect')

    if (rect) {
      rect.setAttribute('fill', fillColor)
      rect.style.setProperty('fill', fillColor, 'important')
      rect.style.cursor = 'pointer'
    }

    group.style.cursor = 'pointer'
  }
}
