import { nanoid } from 'nanoid'
import type { ApiUnit } from '~/types/facility'
import type {
  FloorMapItem,
  FloorMapMatchBuckets,
  FloorMapScene,
  FloorMapTool,
  FloorMapUnitItem
} from '~/types/floorMapBuilder'
import {
  FLOOR_MAP_DEFAULT_ENTRANCE_HEIGHT,
  FLOOR_MAP_DEFAULT_ENTRANCE_WIDTH,
  FLOOR_MAP_DEFAULT_UNIT_METRES,
  FLOOR_MAP_DEFAULT_UNIT_PX,
  FLOOR_MAP_MAX_UNDO,
  FLOOR_MAP_MIN_SIZE,
  FLOOR_MAP_SCALE,
  FLOOR_MAP_SNAP,
  FLOOR_MAP_SCENE_VERSION
} from '~/types/floorMapBuilder'
import { emptyFloorMapScene, hydrateFloorMapScene } from '~/composables/useFloorMapHydrator'

export function cloneFloorMapScene(scene: FloorMapScene): FloorMapScene {
  return {
    version: FLOOR_MAP_SCENE_VERSION,
    viewBox: { ...scene.viewBox },
    backgroundSvg: scene.backgroundSvg,
    items: scene.items.map(item => ({ ...item }))
  }
}

export function snapFloorMapValue(value: number, enabled = true): number {
  if (!enabled) {
    return value
  }

  return Math.round(value / FLOOR_MAP_SNAP) * FLOOR_MAP_SNAP
}

export function sizeForUnit(unit: ApiUnit | null | undefined): { width: number, height: number } {
  const widthM = Number.parseFloat(unit?.actual_width ?? '')
  const depthM = Number.parseFloat(unit?.actual_depth ?? '')
  const width = Number.isFinite(widthM) && widthM > 0
    ? widthM * FLOOR_MAP_SCALE
    : FLOOR_MAP_DEFAULT_UNIT_PX
  const height = Number.isFinite(depthM) && depthM > 0
    ? depthM * FLOOR_MAP_SCALE
    : FLOOR_MAP_SCALE * FLOOR_MAP_DEFAULT_UNIT_METRES

  return {
    width: Math.max(FLOOR_MAP_MIN_SIZE, width),
    height: Math.max(FLOOR_MAP_MIN_SIZE, height)
  }
}

function growViewBox(scene: FloorMapScene): FloorMapScene {
  let width = scene.viewBox.width
  let height = scene.viewBox.height

  for (const item of scene.items) {
    width = Math.max(width, item.x + item.width + 48)
    height = Math.max(height, item.y + item.height + 48)
  }

  if (width === scene.viewBox.width && height === scene.viewBox.height) {
    return scene
  }

  return {
    ...scene,
    viewBox: { width, height }
  }
}

export function matchFloorMapScene(
  scene: FloorMapScene,
  unitNumbers: Array<string>
): FloorMapMatchBuckets {
  const assigned = scene.items
    .filter((item): item is FloorMapUnitItem => item.type === 'unit' && Boolean(item.unit_number))
    .map(item => item.unit_number as string)

  const assignedSet = new Set(assigned)
  const siteSet = new Set(unitNumbers)

  return {
    matched: assigned.filter(number => siteSet.has(number)),
    orphan_shapes: assigned.filter(number => !siteSet.has(number)),
    uncovered_units: unitNumbers.filter(number => !assignedSet.has(number))
  }
}

export function useFloorMapEditor() {
  const scene = ref<FloorMapScene>(emptyFloorMapScene())
  const selectedId = ref<string | null>(null)
  const tool = ref<FloorMapTool>('select')
  const past = ref<Array<FloorMapScene>>([])
  const future = ref<Array<FloorMapScene>>([])
  const baseline = ref(JSON.stringify(scene.value))

  const selectedItem = computed(() => {
    if (!selectedId.value) {
      return null
    }

    return scene.value.items.find(item => item.id === selectedId.value) ?? null
  })

  const assignedUnitNumbers = computed(() => {
    const numbers = new Set<string>()

    for (const item of scene.value.items) {
      if (item.type === 'unit' && item.unit_number) {
        numbers.add(item.unit_number)
      }
    }

    return numbers
  })

  const isDirty = computed(() => JSON.stringify(scene.value) !== baseline.value)
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function markClean() {
    baseline.value = JSON.stringify(scene.value)
  }

  function snapshot() {
    past.value = [...past.value, cloneFloorMapScene(scene.value)].slice(-FLOOR_MAP_MAX_UNDO)
    future.value = []
  }

  function commit(next: FloorMapScene) {
    scene.value = growViewBox(next)
  }

  function resetHistory() {
    past.value = []
    future.value = []
  }

  function loadEmpty() {
    scene.value = emptyFloorMapScene()
    selectedId.value = null
    tool.value = 'select'
    resetHistory()
    markClean()
  }

  function loadScene(next: FloorMapScene) {
    scene.value = growViewBox(cloneFloorMapScene(next))
    selectedId.value = null
    tool.value = 'select'
    resetHistory()
    markClean()
  }

  function loadFromSvg(svgMap: string | null | undefined) {
    scene.value = hydrateFloorMapScene(svgMap)
    selectedId.value = null
    tool.value = 'select'
    resetHistory()
    markClean()
  }

  function select(id: string | null) {
    selectedId.value = id
    if (id) {
      tool.value = 'select'
    }
  }

  function setTool(next: FloorMapTool) {
    tool.value = next
    if (next !== 'select') {
      selectedId.value = null
    }
  }

  function placeItem(
    type: 'unit' | 'entrance',
    x: number,
    y: number,
    options?: { unit_number?: string | null, width?: number, height?: number, snap?: boolean }
  ) {
    snapshot()

    const snap = options?.snap !== false
    const width = options?.width
      ?? (type === 'entrance' ? FLOOR_MAP_DEFAULT_ENTRANCE_WIDTH : FLOOR_MAP_DEFAULT_UNIT_PX)
    const height = options?.height
      ?? (type === 'entrance' ? FLOOR_MAP_DEFAULT_ENTRANCE_HEIGHT : FLOOR_MAP_DEFAULT_UNIT_PX)

    const item: FloorMapItem = type === 'entrance'
      ? {
          id: nanoid(),
          type: 'entrance',
          x: snapFloorMapValue(x - width / 2, snap),
          y: snapFloorMapValue(y - height / 2, snap),
          width,
          height
        }
      : {
          id: nanoid(),
          type: 'unit',
          x: snapFloorMapValue(x - width / 2, snap),
          y: snapFloorMapValue(y - height / 2, snap),
          width,
          height,
          unit_number: options?.unit_number ?? null
        }

    commit({
      ...scene.value,
      items: [...scene.value.items, item]
    })
    selectedId.value = item.id
    tool.value = 'select'
  }

  function placeAssignedUnit(unit: ApiUnit, x: number, y: number, snap = true) {
    if (assignedUnitNumbers.value.has(unit.unit_number)) {
      const existing = scene.value.items.find(
        item => item.type === 'unit' && item.unit_number === unit.unit_number
      )
      selectedId.value = existing?.id ?? null
      return
    }

    const size = sizeForUnit(unit)
    placeItem('unit', x, y, {
      unit_number: unit.unit_number,
      width: size.width,
      height: size.height,
      snap
    })
  }

  function updateItem(id: string, patch: Partial<Omit<FloorMapItem, 'id' | 'type'>>) {
    const current = scene.value.items.find(item => item.id === id)

    if (!current) {
      return
    }

    snapshot()

    const nextItems = scene.value.items.map((item) => {
      if (item.id !== id) {
        return item
      }

      const width = Math.max(FLOOR_MAP_MIN_SIZE, patch.width ?? item.width)
      const height = Math.max(FLOOR_MAP_MIN_SIZE, patch.height ?? item.height)

      if (item.type === 'unit') {
        return {
          ...item,
          ...patch,
          type: 'unit' as const,
          width,
          height,
          unit_number: patch.unit_number === undefined
            ? item.unit_number
            : patch.unit_number
        }
      }

      return {
        ...item,
        x: patch.x ?? item.x,
        y: patch.y ?? item.y,
        width,
        height
      }
    })

    commit({
      ...scene.value,
      items: nextItems
    })
  }

  function moveItem(id: string, x: number, y: number, snap = true) {
    updateItem(id, {
      x: snapFloorMapValue(x, snap),
      y: snapFloorMapValue(y, snap)
    })
  }

  function resizeItem(
    id: string,
    bounds: { x: number, y: number, width: number, height: number },
    snap = true
  ) {
    updateItem(id, {
      x: snapFloorMapValue(bounds.x, snap),
      y: snapFloorMapValue(bounds.y, snap),
      width: Math.max(FLOOR_MAP_MIN_SIZE, snapFloorMapValue(bounds.width, snap)),
      height: Math.max(FLOOR_MAP_MIN_SIZE, snapFloorMapValue(bounds.height, snap))
    })
  }

  /**
   * Live geometry update without pushing undo (used while dragging).
   * Call `beginGesture()` once at pointer-down to snapshot.
   */
  function patchGeometry(
    id: string,
    bounds: { x: number, y: number, width: number, height: number }
  ) {
    const nextItems = scene.value.items.map((item) => {
      if (item.id !== id) {
        return item
      }

      return {
        ...item,
        x: bounds.x,
        y: bounds.y,
        width: Math.max(FLOOR_MAP_MIN_SIZE, bounds.width),
        height: Math.max(FLOOR_MAP_MIN_SIZE, bounds.height)
      }
    })

    commit({
      ...scene.value,
      items: nextItems
    })
  }

  function beginGesture() {
    snapshot()
  }

  function removeItem(id: string) {
    if (!scene.value.items.some(item => item.id === id)) {
      return
    }

    snapshot()
    commit({
      ...scene.value,
      items: scene.value.items.filter(item => item.id !== id)
    })

    if (selectedId.value === id) {
      selectedId.value = null
    }
  }

  function removeSelected() {
    if (selectedId.value) {
      removeItem(selectedId.value)
    }
  }

  function undo() {
    const previous = past.value.at(-1)

    if (!previous) {
      return
    }

    future.value = [...future.value, cloneFloorMapScene(scene.value)]
    past.value = past.value.slice(0, -1)
    scene.value = previous
    selectedId.value = selectedId.value && scene.value.items.some(item => item.id === selectedId.value)
      ? selectedId.value
      : null
  }

  function redo() {
    const next = future.value.at(-1)

    if (!next) {
      return
    }

    past.value = [...past.value, cloneFloorMapScene(scene.value)]
    future.value = future.value.slice(0, -1)
    scene.value = next
    selectedId.value = selectedId.value && scene.value.items.some(item => item.id === selectedId.value)
      ? selectedId.value
      : null
  }

  return {
    scene,
    selectedId,
    selectedItem,
    tool,
    isDirty,
    canUndo,
    canRedo,
    assignedUnitNumbers,
    loadEmpty,
    loadScene,
    loadFromSvg,
    select,
    setTool,
    placeItem,
    placeAssignedUnit,
    updateItem,
    moveItem,
    resizeItem,
    patchGeometry,
    beginGesture,
    removeItem,
    removeSelected,
    undo,
    redo,
    markClean
  }
}
