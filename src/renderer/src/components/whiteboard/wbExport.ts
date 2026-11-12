import type { Bounds, WbElement } from '../../../../shared/whiteboard'
import { FONT, INK, THEME_INK } from './WbElementView'

export type ExportCodeFormat = 'svg' | 'jsx' | 'json'
export type BgShape = 'none' | 'square' | 'rounded' | 'circle'
export type FlipMode = 'none' | 'h' | 'v' | 'both'

export interface SvgExportConfig {
  /** Target max dimension in px (0 = original viewBox size). */
  size: number
  /** Padding around content as percentage of max dimension (0–40). */
  paddingPct: number
  /** Override stroke width in px (0 = keep original). */
  strokeOverride: number
  /** Override stroke/text color ('' = keep original). */
  colorOverride: string
  flip: FlipMode
  rotation: 0 | 90 | 180 | 270
  bgShape: BgShape
  bgColor: string
}

export const DEFAULT_EXPORT_CONFIG: SvgExportConfig = {
  size: 0,
  paddingPct: 10,
  strokeOverride: 0,
  colorOverride: '',
  flip: 'none',
  rotation: 0,
  bgShape: 'square',
  bgColor: '#ffffff'
}

/** Compute padded integer viewBox from element bounds. */
export function paddedViewBox(b: Bounds, pad = 40): Bounds {
  return {
    x: Math.round(b.x - pad),
    y: Math.round(b.y - pad),
    w: Math.max(1, Math.round(b.w + pad * 2)),
    h: Math.max(1, Math.round(b.h + pad * 2))
  }
}

/** Lightly format flat SVG markup into indented lines for readable code export. */
function formatSvgMarkup(raw: string): string {
  const tokens = raw.replace(/>\s*</g, '>\n<').split('\n')
  const lines: string[] = []
  let depth = 0
  for (const token of tokens) {
    const t = token.trim()
    if (!t) continue
    if (t.startsWith('</')) depth = Math.max(0, depth - 1)
    lines.push('  '.repeat(depth) + t)
    if (t.startsWith('<') && !t.startsWith('</') && !t.endsWith('/>') && !t.includes('</')) {
      depth++
    }
  }
  return lines.join('\n')
}

function applyOverrides(innerHtml: string, config: SvgExportConfig): string {
  let html = innerHtml.split(THEME_INK).join(INK)
  if (!config.colorOverride && config.strokeOverride <= 0) return html

  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${html}</svg>`, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || doc.querySelector('parsererror')) return html

  const nodes = root.querySelectorAll('path, rect, ellipse, circle, polygon, line, text')
  nodes.forEach((el) => {
    const stroke = el.getAttribute('stroke')
    if (stroke === 'transparent') return
    if (config.colorOverride) {
      if (stroke && stroke !== 'none') el.setAttribute('stroke', config.colorOverride)
      if (el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'polygon') {
        const fill = el.getAttribute('fill')
        if (fill && fill !== 'none' && fill !== 'transparent') el.setAttribute('fill', config.colorOverride)
      }
    }
    if (config.strokeOverride > 0 && el.hasAttribute('stroke-width')) {
      el.setAttribute('stroke-width', String(config.strokeOverride))
    }
  })

  return root.innerHTML
}

function buildBackgroundNode(vb: Bounds, shape: BgShape, color: string): string {
  if (shape === 'none') return ''
  if (shape === 'square') return `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="${color}"/>`
  if (shape === 'rounded') {
    const rx = Math.round(Math.min(vb.w, vb.h) * 0.14)
    return `<rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" rx="${rx}" fill="${color}"/>`
  }
  const cx = vb.x + vb.w / 2
  const cy = vb.y + vb.h / 2
  const r = Math.min(vb.w, vb.h) / 2
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`
}

function buildTransformAttr(vb: Bounds, flip: FlipMode, rotation: 0 | 90 | 180 | 270): string {
  const sx = flip === 'h' || flip === 'both' ? -1 : 1
  const sy = flip === 'v' || flip === 'both' ? -1 : 1
  if (rotation === 0 && sx === 1 && sy === 1) return ''
  const cx = vb.x + vb.w / 2
  const cy = vb.y + vb.h / 2
  const parts = [`translate(${cx} ${cy})`]
  if (rotation !== 0) parts.push(`rotate(${rotation})`)
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx} ${sy})`)
  parts.push(`translate(${-cx} ${-cy})`)
  return parts.join(' ')
}

/** Build a standalone SVG string from the rendered whiteboard `<g>` innerHTML. */
export function buildSvgString(
  innerHtml: string,
  bounds: Bounds,
  options: { includeBg?: boolean; pretty?: boolean; config?: Partial<SvgExportConfig> } = {}
): string {
  const { includeBg = true, pretty = false, config: partial } = options
  const config: SvgExportConfig = { ...DEFAULT_EXPORT_CONFIG, ...partial }
  if (!includeBg) config.bgShape = 'none'

  const pad = partial?.paddingPct !== undefined ? Math.round(Math.max(bounds.w, bounds.h) * (config.paddingPct / 100)) : 40
  const vb = paddedViewBox(bounds, pad)
  const maxDim = Math.max(vb.w, vb.h)
  const outW = config.size > 0 ? Math.max(1, Math.round((vb.w / maxDim) * config.size)) : vb.w
  const outH = config.size > 0 ? Math.max(1, Math.round((vb.h / maxDim) * config.size)) : vb.h

  const inner = applyOverrides(innerHtml, config)
  const bg = buildBackgroundNode(vb, config.bgShape, config.bgColor)
  const transform = buildTransformAttr(vb, config.flip, config.rotation)
  const content = transform ? `<g transform="${transform}">${inner}</g>` : inner

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${outW}" height="${outH}" font-family='${FONT}'>${bg}${content}</svg>`
  return pretty ? formatSvgMarkup(svg) : svg
}

const SVG_ATTR_TO_JSX: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor'
}

/** Convert an SVG string into a self-contained React TSX component. */
export function svgToReactJsx(svg: string): string {
  const jsx = svg
    .replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, '')
    .replace(/\b(stroke-width|stroke-linecap|stroke-linejoin|font-family|font-size|font-weight|text-anchor)=/g, (_, attr) => `${SVG_ATTR_TO_JSX[attr]}=`)
    .replace(/style="white-space:\s*pre;?"/g, "style={{ whiteSpace: 'pre' }}")
    .replace(/<svg\b([^>]*)>/, '<svg$1 {...props}>')

  const indented = jsx
    .split('\n')
    .map((line) => '    ' + line)
    .join('\n')

  return `import type { SVGProps } from 'react'\n\nexport function WhiteboardDrawing(props: SVGProps<SVGSVGElement>) {\n  return (\n${indented}\n  )\n}\n`
}

/** Generate exportable code in SVG, React JSX, or JSON format. */
export function buildExportCode(
  format: ExportCodeFormat,
  innerHtml: string,
  bounds: Bounds,
  elements: WbElement[],
  config: SvgExportConfig
): string {
  if (format === 'json') return JSON.stringify(elements, null, 2)
  const svg = buildSvgString(innerHtml, bounds, { pretty: true, config })
  return format === 'jsx' ? svgToReactJsx(svg) : svg
}
