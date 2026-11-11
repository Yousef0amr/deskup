import React from 'react'
import type { WbElement } from '../../../../shared/whiteboard'
import { pathData } from '../../../../shared/whiteboard'

/** The default "ink" colour follows the theme on screen; exports swap it back to black. */
export const INK = '#18181b'
export const THEME_INK = 'rgb(var(--text))'
export const FONT = '"Geist Variable", "Segoe UI", system-ui, sans-serif'

export function ink(color: string): string {
  return color === INK ? THEME_INK : color
}

function withAlpha(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

/** Naive word wrap by character budget (SVG has no text wrapping). */
export function wrapLines(text: string, maxChars: number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue
      if (line && (line + ' ' + word).length > maxChars) {
        out.push(line)
        line = word
      } else line = line ? `${line} ${word}` : word
      while (line.length > maxChars) {
        out.push(line.slice(0, maxChars))
        line = line.slice(maxChars)
      }
    }
    out.push(line)
  }
  return out
}

function Lines({ lines, x, y, size, color, anchor = 'start', weight = 400 }: {
  lines: string[]
  x: number
  y: number
  size: number
  color: string
  anchor?: 'start' | 'middle'
  weight?: number
}): React.JSX.Element {
  return (
    <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={FONT} fontWeight={weight} style={{ whiteSpace: 'pre' }}>
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.3}>
          {line || ' '}
        </tspan>
      ))}
    </text>
  )
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, width: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 10 + width * 2.5
  const spread = Math.PI / 7
  const a = [x2 - len * Math.cos(angle - spread), y2 - len * Math.sin(angle - spread)]
  const b = [x2 - len * Math.cos(angle + spread), y2 - len * Math.sin(angle + spread)]
  return `${x2},${y2} ${a.join(',')} ${b.join(',')}`
}

interface Props {
  el: WbElement
  /** Hidden while its text is being edited in the overlay. */
  hideText?: boolean
}

function WbElementView({ el, hideText }: Props): React.JSX.Element {
  const stroke = ink(el.color)
  switch (el.type) {
    case 'path':
      return (
        <g data-id={el.id}>
          <path d={pathData(el.points)} fill="none" stroke="transparent" strokeWidth={Math.max(12, el.width + 8)} strokeLinecap="round" />
          <path d={pathData(el.points)} fill="none" stroke={stroke} strokeWidth={el.width} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'rect':
    case 'ellipse':
    case 'diamond': {
      const fill = el.fill ? withAlpha(el.color === INK ? '#64748b' : el.color, '26') : 'transparent'
      const common = { stroke, strokeWidth: el.width, fill, strokeLinejoin: 'round' as const }
      const label = el.text && !hideText ? wrapLines(el.text, Math.max(4, Math.floor(el.w / 9))) : null
      return (
        <g data-id={el.id}>
          {el.type === 'rect' && <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={8} {...common} />}
          {el.type === 'ellipse' && <ellipse cx={el.x + el.w / 2} cy={el.y + el.h / 2} rx={el.w / 2} ry={el.h / 2} {...common} />}
          {el.type === 'diamond' && (
            <polygon points={`${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w / 2},${el.y + el.h} ${el.x},${el.y + el.h / 2}`} {...common} />
          )}
          {label && (
            <Lines lines={label} x={el.x + el.w / 2} y={el.y + el.h / 2 - ((label.length - 1) * 16 * 1.3) / 2 + 5} size={16} color={stroke} anchor="middle" weight={500} />
          )}
        </g>
      )
    }
    case 'arrow':
    case 'line':
      return (
        <g data-id={el.id}>
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="transparent" strokeWidth={Math.max(12, el.width + 8)} />
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={stroke} strokeWidth={el.width} strokeLinecap="round" />
          {el.type === 'arrow' && <polygon points={arrowHead(el.x1, el.y1, el.x2, el.y2, el.width)} fill={stroke} stroke={stroke} strokeWidth={el.width} strokeLinejoin="round" />}
        </g>
      )
    case 'text':
      return (
        <g data-id={el.id} opacity={hideText ? 0 : 1}>
          <Lines lines={el.text.split('\n')} x={el.x} y={el.y + el.size} size={el.size} color={stroke} weight={500} />
        </g>
      )
    case 'sticky': {
      const lines = hideText ? [] : wrapLines(el.text, Math.max(6, Math.floor((el.w - 24) / 8)))
      return (
        <g data-id={el.id}>
          <rect x={el.x + 2} y={el.y + 4} width={el.w} height={el.h} rx={6} fill="#000" opacity={0.08} />
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={6} fill={el.color} />
          <Lines lines={lines} x={el.x + 12} y={el.y + 26} size={14} color={INK} />
        </g>
      )
    }
  }
}

export default React.memo(WbElementView)
