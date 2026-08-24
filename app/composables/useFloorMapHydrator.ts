import { nanoid } from 'nanoid'
import type {
  FloorMapEntranceItem,
  FloorMapItem,
  FloorMapScene,
  FloorMapUnitItem,
  FloorMapViewBox
} from '~/types/floorMapBuilder'
import {
  FLOOR_MAP_DEFAULT_VIEWBOX,
  FLOOR_MAP_SCENE_VERSION
} from '~/types/floorMapBuilder'

function num(value: string | null, fallback = 0): number {
  if (value == null || value === '') {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseViewBox(raw: string | null): FloorMapViewBox {
  if (!raw) {
    return { ...FLOOR_MAP_DEFAULT_VIEWBOX }
  }

  const parts = raw.trim().split(/[\s,]+/).map(part => Number.parseFloat(part))

  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) {
    return { ...FLOOR_MAP_DEFAULT_VIEWBOX }
  }

  const [minX, minY, width, height] = parts as [number, number, number, number]

  return {
    width: Math.max(FLOOR_MAP_DEFAULT_VIEWBOX.width, minX + width),
    height: Math.max(FLOOR_MAP_DEFAULT_VIEWBOX.height, minY + height)
  }
}

function rectBounds(rect: SVGGraphicsElement | null): { x: number, y: number, width: number, height: number } | null {
  if (!rect) {
    return null
  }

  const width = num(rect.getAttribute('width'))
  const height = num(rect.getAttribute('height'))

  if (width <= 0 || height <= 0) {
    return null
  }

  return {
    x: num(rect.getAttribute('x')),
    y: num(rect.getAttribute('y')),
    width,
    height
  }
}

function uniqueElements(elements: Array<Element>): Array<Element> {
  const seen = new Set<Element>()
  const unique: Array<Element> = []

  for (const element of elements) {
    if (seen.has(element)) {
      continue
    }

    seen.add(element)
    unique.push(element)
  }

  return unique
}

function fitViewBox(viewBox: FloorMapViewBox, items: Array<FloorMapItem>): FloorMapViewBox {
  let width = viewBox.width
  let height = viewBox.height

  for (const item of items) {
    width = Math.max(width, item.x + item.width + 48)
    height = Math.max(height, item.y + item.height + 48)
  }

  return { width, height }
}

export function emptyFloorMapScene(): FloorMapScene {
  return {
    version: FLOOR_MAP_SCENE_VERSION,
    viewBox: { ...FLOOR_MAP_DEFAULT_VIEWBOX },
    backgroundSvg: null,
    items: []
  }
}

/** Parse stored SVG into a builder scene (used when scene is null). */
export function hydrateFloorMapScene(svgMap: string | null | undefined): FloorMapScene {
  if (!svgMap?.trim()) {
    return emptyFloorMapScene()
  }

  const parsed = new DOMParser().parseFromString(svgMap, 'image/svg+xml')

  if (parsed.querySelector('parsererror')) {
    return emptyFloorMapScene()
  }

  const svg = parsed.documentElement

  if (svg.tagName.toLowerCase() !== 'svg') {
    return emptyFloorMapScene()
  }

  const items: Array<FloorMapItem> = []

  const unitGroups = uniqueElements(Array.from(svg.querySelectorAll('g.storage-unit')))

  for (const group of unitGroups) {
    const bounds = rectBounds(group.querySelector<SVGGraphicsElement>('rect.unit, rect'))

    if (!bounds) {
      continue
    }

    const unitNumber = group.getAttribute('data-unit-number') || group.getAttribute('id')
    const item: FloorMapUnitItem = {
      id: nanoid(),
      type: 'unit',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      unit_number: unitNumber?.trim() ? unitNumber.trim() : null
    }

    items.push(item)
    group.remove()
  }

  const entranceGroups = uniqueElements([
    ...Array.from(svg.querySelectorAll('[data-map-item="entrance"]')),
    ...Array.from(svg.querySelectorAll('g.map-item--entrance')),
    ...Array.from(svg.querySelectorAll('g#entrance'))
  ])

  for (const group of entranceGroups) {
    if (!group.isConnected) {
      continue
    }

    const bounds = rectBounds(group.querySelector<SVGGraphicsElement>('rect'))

    if (!bounds) {
      continue
    }

    const item: FloorMapEntranceItem = {
      id: nanoid(),
      type: 'entrance',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }

    items.push(item)
    group.remove()
  }

  const leftover: Array<string> = []

  for (const child of Array.from(svg.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue
    }

    const element = child as Element
    const tag = element.tagName.toLowerCase().replace(/^.*:/, '')

    if (tag === 'title' || tag === 'style' || tag === 'defs') {
      continue
    }

    leftover.push(new XMLSerializer().serializeToString(element))
  }

  const viewBox = fitViewBox(parseViewBox(svg.getAttribute('viewBox')), items)

  return {
    version: FLOOR_MAP_SCENE_VERSION,
    viewBox,
    backgroundSvg: leftover.length ? leftover.join('\n') : null,
    items
  }
}

export function injectSvgFragment(container: SVGGElement | null, fragment: string | null | undefined): void {
  if (!container) {
    return
  }

  container.replaceChildren()

  if (!fragment?.trim()) {
    return
  }

  const parsed = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${fragment}</svg>`,
    'image/svg+xml'
  )

  if (parsed.querySelector('parsererror')) {
    return
  }

  const root = parsed.documentElement

  for (const child of Array.from(root.childNodes)) {
    container.appendChild(document.importNode(child, true))
  }
}
