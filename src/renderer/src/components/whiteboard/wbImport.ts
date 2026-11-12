import type { WbElement } from '../../../../shared/whiteboard'
import { INK } from './WbElementView'

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  gray: '#64748b',
  grey: '#64748b',
  cyan: '#06b6d4',
  indigo: '#6366f1'
}

/** Normalize any CSS color string to a valid hex color for Whiteboard validation. */
function normalizeHexColor(raw: string | null | undefined, fallback = INK): string {
  if (!raw) return fallback
  const s = raw.trim().toLowerCase()
  if (!s || s === 'none' || s === 'transparent' || s === 'currentcolor' || s === 'inherit') return fallback
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s
  if (NAMED_COLORS[s]) return NAMED_COLORS[s]
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) {
    const toHex = (n: string) => Math.min(255, Math.max(0, Number(n))).toString(16).padStart(2, '0')
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`
  }
  return fallback
}

function numAttr(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name)
  if (v === null) return fallback
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

function attrOrStyle(el: Element, name: string): string | null {
  const direct = el.getAttribute(name)
  if (direct !== null) return direct
  const style = el.getAttribute('style')
  if (!style) return null
  const match = style.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'))
  return match ? match[1].trim() : null
}

function parseTranslate(transform: string | null): [number, number] {
  if (!transform) return [0, 0]
  const m = transform.match(/translate\(\s*([-\d.eE+]+)(?:[\s,]+([-\d.eE+]+))?\s*\)/)
  if (!m) return [0, 0]
  const tx = parseFloat(m[1])
  const ty = m[2] !== undefined ? parseFloat(m[2]) : 0
  return [Number.isFinite(tx) ? tx : 0, Number.isFinite(ty) ? ty : 0]
}

function parsePointsList(raw: string | null): [number, number][] {
  if (!raw) return []
  const nums = raw.trim().match(/[-\d.eE+]+/g)?.map(Number).filter(Number.isFinite) ?? []
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push([nums[i], nums[i + 1]])
  }
  return pts
}

/** Sample an SVG path `d` attribute into polyline points using the browser SVG DOM. */
function sampleSvgPath(d: string, tx: number, ty: number): [number, number][] {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  svg.style.position = 'fixed'
  svg.style.left = '-99999px'
  svg.style.top = '-99999px'
  svg.style.width = '0'
  svg.style.height = '0'
  document.body.appendChild(svg)
  try {
    const total = path.getTotalLength()
    if (!Number.isFinite(total) || total <= 0) return []
    const steps = Math.min(300, Math.max(2, Math.ceil(total / 4)))
    const pts: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const p = path.getPointAtLength((i / steps) * total)
      pts.push([Math.round((p.x + tx) * 100) / 100, Math.round((p.y + ty) * 100) / 100])
    }
    return pts
  } finally {
    svg.remove()
  }
}

/** Parse an SVG string into Deskup whiteboard elements. */
export function parseSvgToElements(svgText: string, newId: () => string): WbElement[] {
  const trimmed = svgText.trim()
  if (!trimmed.includes('<svg')) throw new Error('No <svg> element found')

  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('Invalid SVG markup')

  const root = doc.documentElement
  if (!root || root.tagName.toLowerCase() !== 'svg') throw new Error('Root element must be <svg>')

  const vbParts = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  const hasVb = vbParts.length === 4 && vbParts.every(Number.isFinite)

  const out: WbElement[] = []

  const visit = (node: Element, tx: number, ty: number, inheritedStroke: string | null, inheritedFill: string | null, inheritedWidth: number) => {
    const [dx, dy] = parseTranslate(node.getAttribute('transform'))
    const ox = tx + dx
    const oy = ty + dy

    const rawStroke = attrOrStyle(node, 'stroke') ?? inheritedStroke
    const rawFill = attrOrStyle(node, 'fill') ?? inheritedFill
    const rawWidth = attrOrStyle(node, 'stroke-width')
    const width = rawWidth !== null && Number.isFinite(parseFloat(rawWidth))
      ? Math.min(40, Math.max(0.5, parseFloat(rawWidth)))
      : inheritedWidth

    const tag = node.tagName.toLowerCase()

    // Skip invisible hit-target overlays or hidden nodes.
    if (attrOrStyle(node, 'opacity') === '0' || attrOrStyle(node, 'display') === 'none') return
    if (rawStroke === 'transparent' && (!rawFill || rawFill === 'none' || rawFill === 'transparent')) return

    const hasFill = !!rawFill && rawFill !== 'none' && rawFill !== 'transparent'
    const strokeColor = normalizeHexColor(rawStroke, hasFill ? normalizeHexColor(rawFill, INK) : INK)

    if (tag === 'svg' || tag === 'g') {
      for (const child of Array.from(node.children)) {
        visit(child, ox, oy, rawStroke, rawFill, width)
      }
      return
    }

    if (tag === 'rect') {
      const x = numAttr(node, 'x') + ox
      const y = numAttr(node, 'y') + oy
      const w = numAttr(node, 'width')
      const h = numAttr(node, 'height')
      if (w <= 0 || h <= 0) return
      // Skip full-canvas white background rect from exported SVGs.
      if (
        hasVb &&
        Math.abs(x - vbParts[0]) < 1 &&
        Math.abs(y - vbParts[1]) < 1 &&
        Math.abs(w - vbParts[2]) < 1 &&
        Math.abs(h - vbParts[3]) < 1 &&
        (!rawStroke || rawStroke === 'none') &&
        normalizeHexColor(rawFill, '') === '#ffffff'
      ) {
        return
      }
      out.push({ id: newId(), type: 'rect', color: strokeColor, x, y, w, h, width, fill: hasFill })
      return
    }

    if (tag === 'circle') {
      const cx = numAttr(node, 'cx') + ox
      const cy = numAttr(node, 'cy') + oy
      const r = numAttr(node, 'r')
      if (r <= 0) return
      out.push({ id: newId(), type: 'ellipse', color: strokeColor, x: cx - r, y: cy - r, w: r * 2, h: r * 2, width, fill: hasFill })
      return
    }

    if (tag === 'ellipse') {
      const cx = numAttr(node, 'cx') + ox
      const cy = numAttr(node, 'cy') + oy
      const rx = numAttr(node, 'rx')
      const ry = numAttr(node, 'ry')
      if (rx <= 0 || ry <= 0) return
      out.push({ id: newId(), type: 'ellipse', color: strokeColor, x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2, width, fill: hasFill })
      return
    }

    if (tag === 'line') {
      out.push({
        id: newId(),
        type: 'line',
        color: strokeColor,
        x1: numAttr(node, 'x1') + ox,
        y1: numAttr(node, 'y1') + oy,
        x2: numAttr(node, 'x2') + ox,
        y2: numAttr(node, 'y2') + oy,
        width
      })
      return
    }

    if (tag === 'polyline' || tag === 'polygon') {
      const pts = parsePointsList(node.getAttribute('points')).map(([px, py]): [number, number] => [px + ox, py + oy])
      if (pts.length < 2) return
      if (tag === 'polygon') pts.push(pts[0])
      out.push({ id: newId(), type: 'path', color: strokeColor, points: pts, width })
      return
    }

    if (tag === 'path') {
      const d = node.getAttribute('d')
      if (!d) return
      const pts = sampleSvgPath(d, ox, oy)
      if (pts.length < 1) return
      out.push({ id: newId(), type: 'path', color: strokeColor, points: pts, width })
      return
    }

    if (tag === 'text') {
      const content = (node.textContent ?? '').trim()
      if (!content) return
      const rawSize = attrOrStyle(node, 'font-size')
      const size = rawSize && Number.isFinite(parseFloat(rawSize)) ? Math.min(160, Math.max(8, parseFloat(rawSize))) : 16
      const textColor = normalizeHexColor(rawFill ?? rawStroke, INK)
      const x = numAttr(node, 'x') + ox
      const y = numAttr(node, 'y') + oy - size
      out.push({ id: newId(), type: 'text', color: textColor, x, y, text: content, size })
    }
  }

  visit(root, 0, 0, null, null, 2)

  if (out.length === 0) throw new Error('No supported SVG shapes found')
  return out
}

