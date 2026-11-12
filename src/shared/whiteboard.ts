// Whiteboard: freeform canvas data model, validation and geometry helpers.

export type ShapeKind = 'rect' | 'ellipse' | 'diamond'
export type LineKind = 'arrow' | 'line'
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'
export type ElementAnimation = 'none' | 'pulse' | 'float' | 'spin' | 'bounce'

interface Base {
  id: string
  color: string
  /** Element opacity in (0, 1], defaults to 1. */
  opacity?: number
  /** Rotation in degrees around element center. */
  rotation?: number
  /** Optional SVG animation preset. */
  animation?: ElementAnimation
  /** Animation speed multiplier (defaults to 1). */
  animationSpeed?: number
  /** Shared ID linking grouped elements. */
  groupId?: string
  /** Locked elements cannot be moved or erased on canvas. */
  locked?: boolean
  /** Hidden elements are omitted from rendering. */
  hidden?: boolean
}
export interface PathElement extends Base {
  type: 'path'
  points: [number, number][]
  width: number
  strokeStyle?: StrokeStyle
}
export interface ShapeElement extends Base {
  type: ShapeKind
  x: number
  y: number
  w: number
  h: number
  width: number
  fill: boolean
  fillColor?: string
  strokeStyle?: StrokeStyle
  /** Corner radius for rectangles (defaults to 8). */
  rx?: number
  /** Independent [TL, TR, BR, BL] corner radii for rectangles. */
  corners?: [number, number, number, number]
  /** 3D extrusion depth in px (0 = flat). */
  depth?: number
  /** 3D extrusion angle in degrees (defaults to 35). */
  depthAngle?: number
  /** Optional label centred in the shape. */
  text?: string
}
export interface LineElement extends Base {
  type: LineKind
  x1: number
  y1: number
  x2: number
  y2: number
  /** Optional quadratic Bezier control point for curved lines/arrows. */
  cx?: number
  cy?: number
  width: number
  strokeStyle?: StrokeStyle
}
export interface TextElement extends Base {
  type: 'text'
  x: number
  y: number
  text: string
  size: number
}
export interface StickyElement extends Base {
  type: 'sticky'
  x: number
  y: number
  w: number
  h: number
  text: string
}
export interface ImageElement extends Base {
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  /** Data URL (data:image/...;base64,...) for any image format. */
  src: string
  /** Optional corner radius in px. */
  rx?: number
}
export type WbElement = PathElement | ShapeElement | LineElement | TextElement | StickyElement | ImageElement

export interface Whiteboard {
  id: string
  name: string
  elements: WbElement[]
  createdAt: number
  updatedAt: number
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export const WB_COLORS = [
  '#18181b',
  '#3753df',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#d97706',
  '#e11d48',
  '#db2777',
  '#7c3aed',
  '#64748b',
  '#ffffff'
]
export const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa']
const LIMITS = { boards: 50, elements: 5000, points: 4000, text: 5000, coord: 1e7 }

export function createWhiteboard(id: string, name = 'Untitled whiteboard', now = Date.now()): Whiteboard {
  return { id, name, elements: [], createdAt: now, updatedAt: now }
}

/** Axis-aligned bounds of an element in world coordinates. */
export function elementBounds(el: WbElement): Bounds {
  switch (el.type) {
    case 'path': {
      const xs = el.points.map((p) => p[0])
      const ys = el.points.map((p) => p[1])
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
    }
    case 'arrow':
    case 'line': {
      const xs = el.cx !== undefined ? [el.x1, el.x2, el.cx] : [el.x1, el.x2]
      const ys = el.cy !== undefined ? [el.y1, el.y2, el.cy] : [el.y1, el.y2]
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
    }
    case 'text': {
      const lines = el.text.split('\n')
      const longest = Math.max(1, ...lines.map((l) => l.length))
      return { x: el.x, y: el.y, w: longest * el.size * 0.6, h: lines.length * el.size * 1.3 }
    }
    default:
      return { x: el.x, y: el.y, w: el.w, h: el.h }
  }
}

export function unionBounds(list: Bounds[]): Bounds | null {
  if (!list.length) return null
  const x = Math.min(...list.map((b) => b.x))
  const y = Math.min(...list.map((b) => b.y))
  const x2 = Math.max(...list.map((b) => b.x + b.w))
  const y2 = Math.max(...list.map((b) => b.y + b.h))
  return { x, y, w: x2 - x, h: y2 - y }
}

export function intersects(a: Bounds, b: Bounds): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
}

/** Normalize a drag rectangle so width/height are positive. */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Bounds {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

/** Shift an element by (dx, dy). */
export function translateElement<T extends WbElement>(el: T, dx: number, dy: number): T {
  switch (el.type) {
    case 'path':
      return { ...el, points: el.points.map(([x, y]) => [x + dx, y + dy]) } as T
    case 'arrow':
    case 'line':
      return {
        ...el,
        x1: el.x1 + dx,
        y1: el.y1 + dy,
        x2: el.x2 + dx,
        y2: el.y2 + dy,
        ...(el.cx !== undefined && el.cy !== undefined ? { cx: el.cx + dx, cy: el.cy + dy } : {})
      } as T
    default:
      return { ...el, x: (el as { x: number }).x + dx, y: (el as { y: number }).y + dy } as T
  }
}

/** Drop points closer than `minDist` to the previous kept point (keeps strokes light). */
export function simplifyPoints(points: [number, number][], minDist = 1.5): [number, number][] {
  if (points.length <= 2) return points
  const out: [number, number][] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = out[out.length - 1]
    if (Math.hypot(points[i][0] - px, points[i][1] - py) >= minDist) out.push(points[i])
  }
  out.push(points[points.length - 1])
  return out
}

/** Smooth SVG path through freehand points (quadratic midpoints). */
export function pathData(points: [number, number][]): string {
  if (!points.length) return ''
  if (points.length < 3) return `M${points.map((p) => p.join(' ')).join(' L')}`
  let d = `M${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const [nx, ny] = points[i + 1]
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`
  }
  const last = points[points.length - 1]
  return `${d} L${last[0]} ${last[1]}`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>
function obj(v: unknown, what: string): Raw {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${what}`)
  return v as Raw
}
function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > LIMITS.coord) throw new Error(`Invalid ${what}`)
  return v
}
/** Epoch milliseconds — not subject to the coordinate range limit. */
function timestamp(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Error(`Invalid ${what}`)
  return v
}
function color(v: unknown): string {
  if (typeof v !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(v)) throw new Error('Invalid color')
  return v
}
function text(v: unknown, what: string): string {
  if (typeof v !== 'string') throw new Error(`Invalid ${what}`)
  return v.slice(0, LIMITS.text)
}
function strokeWidth(v: unknown): number {
  return Math.max(0.5, num(v, 'stroke width'))
}
function optOpacity(v: unknown): number | undefined {
  if (v === undefined) return undefined
  return Math.min(1, Math.max(0.05, num(v, 'opacity')))
}
function optStrokeStyle(v: unknown): StrokeStyle | undefined {
  if (v === undefined) return undefined
  if (v === 'solid' || v === 'dashed' || v === 'dotted') return v
  throw new Error('Invalid stroke style')
}
function optAnimation(v: unknown): ElementAnimation | undefined {
  if (v === undefined) return undefined
  if (v === 'none' || v === 'pulse' || v === 'float' || v === 'spin' || v === 'bounce') return v
  throw new Error('Invalid animation')
}

function validateElement(value: unknown): WbElement {
  const r = obj(value, 'element')
  if (typeof r.id !== 'string' || !r.id) throw new Error('Element ID is required')
  const opacity = optOpacity(r.opacity)
  const rotation = r.rotation !== undefined ? Math.max(-360, Math.min(360, num(r.rotation, 'rotation'))) : undefined
  const animation = optAnimation(r.animation)
  const animationSpeed = r.animationSpeed !== undefined ? Math.max(0.25, Math.min(5, num(r.animationSpeed, 'animation speed'))) : undefined
  const groupId = typeof r.groupId === 'string' && r.groupId ? r.groupId.slice(0, 64) : undefined
  const base = {
    id: r.id.slice(0, 64),
    color: color(r.color),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotation !== undefined ? { rotation } : {}),
    ...(animation && animation !== 'none' ? { animation } : {}),
    ...(animationSpeed !== undefined ? { animationSpeed } : {}),
    ...(groupId ? { groupId } : {}),
    ...(r.locked === true ? { locked: true } : {}),
    ...(r.hidden === true ? { hidden: true } : {})
  }
  switch (r.type) {
    case 'path': {
      if (!Array.isArray(r.points) || r.points.length < 1) throw new Error('Invalid path')
      const points = r.points.slice(0, LIMITS.points).map((p): [number, number] => {
        if (!Array.isArray(p) || p.length !== 2) throw new Error('Invalid path point')
        return [num(p[0], 'x'), num(p[1], 'y')]
      })
      const strokeStyle = optStrokeStyle(r.strokeStyle)
      return { ...base, type: 'path', points, width: strokeWidth(r.width), ...(strokeStyle ? { strokeStyle } : {}) }
    }
    case 'rect':
    case 'ellipse':
    case 'diamond': {
      const strokeStyle = optStrokeStyle(r.strokeStyle)
      const fillColor = r.fillColor !== undefined ? color(r.fillColor) : undefined
      const rx = r.rx !== undefined ? Math.max(0, num(r.rx, 'corner radius')) : undefined
      const corners =
        Array.isArray(r.corners) && r.corners.length === 4
          ? (r.corners.map((c) => Math.max(0, num(c, 'corner radius'))) as [number, number, number, number])
          : undefined
      const depth = r.depth !== undefined ? Math.max(0, num(r.depth, '3D depth')) : undefined
      const depthAngle = r.depthAngle !== undefined ? Math.max(0, Math.min(360, num(r.depthAngle, '3D angle'))) : undefined
      return {
        ...base,
        type: r.type,
        x: num(r.x, 'x'),
        y: num(r.y, 'y'),
        w: Math.max(0, num(r.w, 'width')),
        h: Math.max(0, num(r.h, 'height')),
        width: strokeWidth(r.width),
        fill: r.fill === true,
        ...(fillColor ? { fillColor } : {}),
        ...(strokeStyle ? { strokeStyle } : {}),
        ...(rx !== undefined ? { rx } : {}),
        ...(corners ? { corners } : {}),
        ...(depth !== undefined ? { depth } : {}),
        ...(depthAngle !== undefined ? { depthAngle } : {}),
        ...(r.text !== undefined ? { text: text(r.text, 'shape text') } : {})
      }
    }
    case 'arrow':
    case 'line': {
      const strokeStyle = optStrokeStyle(r.strokeStyle)
      const hasCurve = r.cx !== undefined && r.cy !== undefined
      return {
        ...base,
        type: r.type,
        x1: num(r.x1, 'x1'),
        y1: num(r.y1, 'y1'),
        x2: num(r.x2, 'x2'),
        y2: num(r.y2, 'y2'),
        ...(hasCurve ? { cx: num(r.cx, 'cx'), cy: num(r.cy, 'cy') } : {}),
        width: strokeWidth(r.width),
        ...(strokeStyle ? { strokeStyle } : {})
      }
    }
    case 'text':
      return { ...base, type: 'text', x: num(r.x, 'x'), y: num(r.y, 'y'), text: text(r.text, 'text'), size: Math.max(1, num(r.size, 'font size')) }
    case 'sticky':
      return { ...base, type: 'sticky', x: num(r.x, 'x'), y: num(r.y, 'y'), w: Math.max(40, num(r.w, 'width')), h: Math.max(40, num(r.h, 'height')), text: text(r.text, 'sticky text') }
    case 'image': {
      if (typeof r.src !== 'string' || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(r.src) || r.src.length > 20_000_000) {
        throw new Error('Invalid image data URL')
      }
      const rx = r.rx !== undefined ? Math.max(0, num(r.rx, 'corner radius')) : undefined
      return {
        ...base,
        type: 'image',
        x: num(r.x, 'x'),
        y: num(r.y, 'y'),
        w: Math.max(8, num(r.w, 'width')),
        h: Math.max(8, num(r.h, 'height')),
        src: r.src,
        ...(rx !== undefined ? { rx } : {})
      }
    }
    default:
      throw new Error('Unknown element type')
  }
}

export function validateWhiteboards(value: unknown): Whiteboard[] {
  if (!Array.isArray(value)) throw new Error('Whiteboards must be a list')
  if (value.length > LIMITS.boards) throw new Error('Too many whiteboards')
  const ids = new Set<string>()
  return value.map((b) => {
    const r = obj(b, 'whiteboard')
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id)) throw new Error('Missing or duplicate whiteboard ID')
    ids.add(r.id)
    if (!Array.isArray(r.elements) || r.elements.length > LIMITS.elements) throw new Error('Invalid whiteboard elements')
    const elementIds = new Set<string>()
    const elements = r.elements.map(validateElement).filter((el) => {
      if (elementIds.has(el.id)) return false
      elementIds.add(el.id)
      return true
    })
    return {
      id: r.id.slice(0, 64),
      name: (typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Untitled whiteboard').slice(0, 80),
      elements,
      createdAt: timestamp(r.createdAt, 'creation time'),
      updatedAt: timestamp(r.updatedAt, 'update time')
    }
  })
}
