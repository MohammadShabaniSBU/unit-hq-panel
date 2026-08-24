<script setup lang="ts">
import type {
  FloorMapItem,
  FloorMapResizeHandle,
  FloorMapScene,
  FloorMapTool
} from '~/types/floorMapBuilder'
import { FLOOR_MAP_MIN_SIZE, FLOOR_MAP_SNAP } from '~/types/floorMapBuilder'
import { injectSvgFragment } from '~/composables/useFloorMapHydrator'
import { snapFloorMapValue } from '~/composables/useFloorMapEditor'

const props = defineProps<{
  scene: FloorMapScene
  selectedId: string | null
  tool: FloorMapTool
}>()

const emit = defineEmits<{
  select: [id: string | null]
  place: [type: 'unit' | 'entrance', x: number, y: number]
  gestureStart: []
  geometry: [id: string, bounds: { x: number, y: number, width: number, height: number }]
}>()

const viewport = ref<HTMLElement | null>(null)
const backgroundGroup = ref<SVGGElement | null>(null)
const camera = reactive({ x: 0, y: 0, k: 1 })
const viewportSize = reactive({ width: 800, height: 600 })
const spaceDown = ref(false)
const didFit = ref(false)

type DragMode = 'none' | 'pan' | 'move' | 'resize'

const drag = reactive<{
  mode: DragMode
  pointerId: number | null
  startClientX: number
  startClientY: number
  startCameraX: number
  startCameraY: number
  itemId: string | null
  handle: FloorMapResizeHandle | null
  origin: { x: number, y: number, width: number, height: number } | null
  moved: boolean
}>({
  mode: 'none',
  pointerId: null,
  startClientX: 0,
  startClientY: 0,
  startCameraX: 0,
  startCameraY: 0,
  itemId: null,
  handle: null,
  origin: null,
  moved: false
})

const cameraViewBox = computed(() => {
  const width = Math.max(1, viewportSize.width / camera.k)
  const height = Math.max(1, viewportSize.height / camera.k)
  return `${camera.x} ${camera.y} ${width} ${height}`
})

const handleSize = computed(() => 8 / camera.k)

const handles: Array<FloorMapResizeHandle> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const selectedItem = computed(() => {
  if (!props.selectedId) {
    return null
  }

  return props.scene.items.find(item => item.id === props.selectedId) ?? null
})

watch(() => props.scene.backgroundSvg, (fragment) => {
  injectSvgFragment(backgroundGroup.value, fragment)
}, { flush: 'post' })

onMounted(() => {
  injectSvgFragment(backgroundGroup.value, props.scene.backgroundSvg)
  observeViewport()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

let resizeObserver: ResizeObserver | null = null

function observeViewport() {
  if (!viewport.value) {
    return
  }

  const updateSize = () => {
    if (!viewport.value) {
      return
    }

    const rect = viewport.value.getBoundingClientRect()
    viewportSize.width = rect.width
    viewportSize.height = rect.height

    if (!didFit.value && rect.width > 0 && rect.height > 0) {
      fitToScene()
      didFit.value = true
    }
  }

  updateSize()
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(viewport.value)
}

function fitToScene() {
  const pad = 48
  const width = Math.max(1, props.scene.viewBox.width)
  const height = Math.max(1, props.scene.viewBox.height)
  const scale = Math.min(
    (viewportSize.width - pad * 2) / width,
    (viewportSize.height - pad * 2) / height,
    1.4
  )
  camera.k = Math.max(0.2, scale)
  camera.x = -(viewportSize.width / camera.k - width) / 2
  camera.y = -(viewportSize.height / camera.k - height) / 2
}

function onKeyDown(event: KeyboardEvent) {
  if (event.code === 'Space') {
    spaceDown.value = true
    event.preventDefault()
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') {
    spaceDown.value = false
  }
}

function clientToScene(clientX: number, clientY: number) {
  const el = viewport.value

  if (!el) {
    return { x: 0, y: 0 }
  }

  const rect = el.getBoundingClientRect()

  return {
    x: camera.x + (clientX - rect.left) / camera.k,
    y: camera.y + (clientY - rect.top) / camera.k
  }
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const scenePoint = clientToScene(event.clientX, event.clientY)
  const factor = event.deltaY < 0 ? 1.08 : 0.92
  const nextK = Math.min(5, Math.max(0.2, camera.k * factor))
  const ratio = camera.k / nextK
  camera.x = scenePoint.x - (scenePoint.x - camera.x) * ratio
  camera.y = scenePoint.y - (scenePoint.y - camera.y) * ratio
  camera.k = nextK
}

function itemAt(id: string) {
  return props.scene.items.find(item => item.id === id) ?? null
}

function onPointerDown(event: PointerEvent) {
  if (event.button === 1 || spaceDown.value) {
    startPan(event)
    return
  }

  if (event.button !== 0) {
    return
  }

  const target = event.target as Element | null
  const handle = target?.closest?.('[data-handle]')?.getAttribute('data-handle') as FloorMapResizeHandle | null
  const itemId = target?.closest?.('[data-item-id]')?.getAttribute('data-item-id')

  if (handle && props.selectedId) {
    const item = itemAt(props.selectedId)

    if (!item) {
      return
    }

    startResize(event, item, handle)
    return
  }

  if (itemId) {
    emit('select', itemId)
    const item = itemAt(itemId)

    if (!item) {
      return
    }

    startMove(event, item)
    return
  }

  const scenePoint = clientToScene(event.clientX, event.clientY)

  if (props.tool === 'unit' || props.tool === 'entrance') {
    emit('place', props.tool, scenePoint.x, scenePoint.y)
    return
  }

  emit('select', null)
}

function startPan(event: PointerEvent) {
  drag.mode = 'pan'
  drag.pointerId = event.pointerId
  drag.startClientX = event.clientX
  drag.startClientY = event.clientY
  drag.startCameraX = camera.x
  drag.startCameraY = camera.y
  viewport.value?.setPointerCapture(event.pointerId)
}

function startMove(event: PointerEvent, item: FloorMapItem) {
  drag.mode = 'move'
  drag.pointerId = event.pointerId
  drag.itemId = item.id
  drag.origin = { x: item.x, y: item.y, width: item.width, height: item.height }
  drag.startClientX = event.clientX
  drag.startClientY = event.clientY
  drag.moved = false
  viewport.value?.setPointerCapture(event.pointerId)
}

function startResize(event: PointerEvent, item: FloorMapItem, handle: FloorMapResizeHandle) {
  drag.mode = 'resize'
  drag.pointerId = event.pointerId
  drag.itemId = item.id
  drag.handle = handle
  drag.origin = { x: item.x, y: item.y, width: item.width, height: item.height }
  drag.startClientX = event.clientX
  drag.startClientY = event.clientY
  drag.moved = false
  viewport.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (drag.mode === 'none' || drag.pointerId !== event.pointerId) {
    return
  }

  const dx = (event.clientX - drag.startClientX) / camera.k
  const dy = (event.clientY - drag.startClientY) / camera.k

  if (drag.mode === 'pan') {
    camera.x = drag.startCameraX - dx
    camera.y = drag.startCameraY - dy
    return
  }

  if (!drag.itemId || !drag.origin) {
    return
  }

  if (Math.abs(dx) + Math.abs(dy) < 0.5 && !drag.moved) {
    return
  }

  if (!drag.moved) {
    emit('gestureStart')
    drag.moved = true
  }

  const snap = !event.altKey

  if (drag.mode === 'move') {
    emit('geometry', drag.itemId, {
      x: snapFloorMapValue(drag.origin.x + dx, snap),
      y: snapFloorMapValue(drag.origin.y + dy, snap),
      width: drag.origin.width,
      height: drag.origin.height
    })
    return
  }

  if (drag.mode === 'resize' && drag.handle) {
    emit('geometry', drag.itemId, resizeBounds(drag.origin, drag.handle, dx, dy, snap))
  }
}

function onPointerUp(event: PointerEvent) {
  if (drag.pointerId !== event.pointerId) {
    return
  }

  drag.mode = 'none'
  drag.pointerId = null
  drag.itemId = null
  drag.handle = null
  drag.origin = null
  drag.moved = false
}

function resizeBounds(
  origin: { x: number, y: number, width: number, height: number },
  handle: FloorMapResizeHandle,
  dx: number,
  dy: number,
  snap: boolean
) {
  let x = origin.x
  let y = origin.y
  let width = origin.width
  let height = origin.height

  if (handle.includes('e')) {
    width = origin.width + dx
  }

  if (handle.includes('s')) {
    height = origin.height + dy
  }

  if (handle.includes('w')) {
    x = origin.x + dx
    width = origin.width - dx
  }

  if (handle.includes('n')) {
    y = origin.y + dy
    height = origin.height - dy
  }

  if (width < FLOOR_MAP_MIN_SIZE) {
    if (handle.includes('w')) {
      x = origin.x + origin.width - FLOOR_MAP_MIN_SIZE
    }
    width = FLOOR_MAP_MIN_SIZE
  }

  if (height < FLOOR_MAP_MIN_SIZE) {
    if (handle.includes('n')) {
      y = origin.y + origin.height - FLOOR_MAP_MIN_SIZE
    }
    height = FLOOR_MAP_MIN_SIZE
  }

  return {
    x: snapFloorMapValue(x, snap),
    y: snapFloorMapValue(y, snap),
    width: Math.max(FLOOR_MAP_MIN_SIZE, snapFloorMapValue(width, snap) || FLOOR_MAP_SNAP),
    height: Math.max(FLOOR_MAP_MIN_SIZE, snapFloorMapValue(height, snap) || FLOOR_MAP_SNAP)
  }
}

function handlePoint(item: FloorMapItem, handle: FloorMapResizeHandle) {
  const midX = item.x + item.width / 2
  const midY = item.y + item.height / 2
  const right = item.x + item.width
  const bottom = item.y + item.height

  switch (handle) {
    case 'nw': return { x: item.x, y: item.y }
    case 'n': return { x: midX, y: item.y }
    case 'ne': return { x: right, y: item.y }
    case 'e': return { x: right, y: midY }
    case 'se': return { x: right, y: bottom }
    case 's': return { x: midX, y: bottom }
    case 'sw': return { x: item.x, y: bottom }
    case 'w': return { x: item.x, y: midY }
  }
}

function handleCursor(handle: FloorMapResizeHandle) {
  if (handle === 'n' || handle === 's') {
    return 'ns-resize'
  }

  if (handle === 'e' || handle === 'w') {
    return 'ew-resize'
  }

  if (handle === 'nw' || handle === 'se') {
    return 'nwse-resize'
  }

  return 'nesw-resize'
}

function unitLabel(item: FloorMapItem) {
  if (item.type !== 'unit') {
    return ''
  }

  return item.unit_number ?? ''
}

const cursorClass = computed(() => {
  if (spaceDown.value || drag.mode === 'pan') {
    return 'cursor-grab'
  }

  if (props.tool !== 'select') {
    return 'cursor-crosshair'
  }

  return 'cursor-default'
})
</script>

<template>
  <div
    ref="viewport"
    class="relative h-full w-full overflow-hidden bg-elevated"
    :class="cursorClass"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <svg
      class="h-full w-full select-none"
      :viewBox="cameraViewBox"
    >
      <defs>
        <pattern
          id="floor-map-grid"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 16 0 L 0 0 0 16"
            fill="none"
            stroke="currentColor"
            class="text-muted"
            stroke-width="0.5"
            opacity="0.35"
          />
        </pattern>
      </defs>

      <rect
        x="0"
        y="0"
        :width="scene.viewBox.width"
        :height="scene.viewBox.height"
        class="fill-white dark:fill-neutral-900"
      />
      <rect
        x="0"
        y="0"
        :width="scene.viewBox.width"
        :height="scene.viewBox.height"
        fill="url(#floor-map-grid)"
      />

      <g
        ref="backgroundGroup"
        class="pointer-events-none opacity-70"
      />

      <g
        v-for="item in scene.items"
        :key="item.id"
        :data-item-id="item.id"
      >
        <rect
          v-if="item.type === 'unit'"
          class="unit"
          :x="item.x"
          :y="item.y"
          :width="item.width"
          :height="item.height"
          :fill="item.unit_number ? '#ffffff' : '#f3f4f6'"
          stroke="#111827"
          :stroke-width="selectedId === item.id ? 2.5 : 1.5"
          :stroke-dasharray="item.unit_number ? 'none' : '6 4'"
        />
        <text
          v-if="item.type === 'unit'"
          class="pointer-events-none"
          :x="item.x + item.width / 2"
          :y="item.y + item.height / 2 + 3"
          text-anchor="middle"
          font-size="10"
          font-weight="bold"
          fill="#111827"
        >
          {{ unitLabel(item) || $t('pages.settings.mapBuilder.unassignedLabel') }}
        </text>

        <rect
          v-if="item.type === 'entrance'"
          class="core-outline"
          :x="item.x"
          :y="item.y"
          :width="item.width"
          :height="item.height"
          fill="#ffffff"
          stroke="#111827"
          :stroke-width="selectedId === item.id ? 2.5 : 2"
        />
        <text
          v-if="item.type === 'entrance'"
          class="pointer-events-none"
          :x="item.x + item.width / 2"
          :y="item.y + item.height - 10"
          text-anchor="middle"
          font-size="9"
          font-weight="bold"
          fill="#111827"
        >
          {{ $t('pages.settings.mapBuilder.entranceLabel') }}
        </text>
      </g>

      <g v-if="selectedItem">
        <rect
          v-for="handle in handles"
          :key="handle"
          :data-handle="handle"
          :x="handlePoint(selectedItem, handle).x - handleSize / 2"
          :y="handlePoint(selectedItem, handle).y - handleSize / 2"
          :width="handleSize"
          :height="handleSize"
          fill="#2563eb"
          stroke="#ffffff"
          stroke-width="1"
          :style="{ cursor: handleCursor(handle) }"
        />
      </g>
    </svg>
  </div>
</template>
