export const FLOOR_MAP_SCENE_VERSION = 1

export const FLOOR_MAP_SCALE = 26
export const FLOOR_MAP_DEFAULT_UNIT_METRES = 3
export const FLOOR_MAP_DEFAULT_UNIT_PX = FLOOR_MAP_SCALE * FLOOR_MAP_DEFAULT_UNIT_METRES
export const FLOOR_MAP_DEFAULT_ENTRANCE_WIDTH = 88
export const FLOOR_MAP_DEFAULT_ENTRANCE_HEIGHT = 66
export const FLOOR_MAP_SNAP = 8
export const FLOOR_MAP_MIN_SIZE = 24
export const FLOOR_MAP_DEFAULT_VIEWBOX = { width: 1200, height: 800 } as const
export const FLOOR_MAP_MAX_UNDO = 50

export type FloorMapTool = 'select' | 'unit' | 'entrance'

export type FloorMapResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export interface FloorMapViewBox {
  width: number
  height: number
}

export interface FloorMapUnitItem {
  id: string
  type: 'unit'
  x: number
  y: number
  width: number
  height: number
  unit_number: string | null
}

export interface FloorMapEntranceItem {
  id: string
  type: 'entrance'
  x: number
  y: number
  width: number
  height: number
}

export type FloorMapItem = FloorMapUnitItem | FloorMapEntranceItem

export interface FloorMapScene {
  version: typeof FLOOR_MAP_SCENE_VERSION
  viewBox: FloorMapViewBox
  backgroundSvg: string | null
  items: Array<FloorMapItem>
}

export interface FloorMapMatchBuckets {
  matched: Array<string>
  orphan_shapes: Array<string>
  uncovered_units: Array<string>
}
