import React from 'react'
import type { StrokeStyle, WbElement } from '../../../../shared/whiteboard'
import { elementBounds, pathData } from '../../../../shared/whiteboard'

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

function dashArray(style: StrokeStyle | undefined, width: number): string | undefined {
  if (style === 'dashed') return `${Math.max(4, width * 3)} ${Math.max(3, width * 2)}`
  if (style === 'dotted') return `0.1 ${Math.max(3, width * 2.2)}`
  return undefined
}

function roundedRectPath(x: number, y: number, w: number, h: number, corners: [number, number, number, number]): string {
  const cap = Math.min(w, h) / 2
  const [tl, tr, br, bl] = corners.map((c) => Math.max(0, Math.min(cap, c)))
  return [
    `M${x + tl} ${y}`,
    `H${x + w - tr}`,
    tr > 0 ? `Q${x + w} ${y} ${x + w} ${y + tr}` : '',
    `V${y + h - br}`,
    br > 0 ? `Q${x + w} ${y + h} ${x + w - br} ${y + h}` : '',
    `H${x + bl}`,
    bl > 0 ? `Q${x} ${y + h} ${x} ${y + h - bl}` : '',
    `V${y + tl}`,
    tl > 0 ? `Q${x} ${y} ${x + tl} ${y}` : '',
    'Z'
  ]
    .filter(Boolean)
    .join(' ')
}

function AnimatedGroup({ el, children }: { el: WbElement; children: React.ReactNode }): React.JSX.Element {
  const anim = el.animation
  if (!anim || anim === 'none') return <>{children}</>
  const speed = el.animationSpeed ?? 1
  const dur = (base: number) => `${(base / speed).toFixed(2)}s`
  const b = elementBounds(el)
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2

  if (anim === 'spin') {
    return (
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={dur(4)} repeatCount="indefinite" />
        {children}
      </g>
    )
  }
  if (anim === 'pulse') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <g>
          <animateTransform attributeName="transform" type="scale" values="1;1.08;1" dur={dur(1.6)} repeatCount="indefinite" />
          <g transform={`translate(${-cx} ${-cy})`}>{children}</g>
        </g>
      </g>
    )
  }
  if (anim === 'float') {
    return (
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -8; 0 0" dur={dur(2.4)} repeatCount="indefinite" />
        {children}
      </g>
    )
  }
  return (
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -16; 0 0; 0 -7; 0 0" dur={dur(1.2)} repeatCount="indefinite" />
      {children}
    </g>
  )
}

function WbElementView({ el, hideText }: Props): React.JSX.Element | null {
  if (el.hidden) return null
  const stroke = ink(el.color)
  const opacity = el.opacity !== undefined && el.opacity < 1 ? el.opacity : undefined
  const rotateTransform = (() => {
    if (!el.rotation) return undefined
    const b = elementBounds(el)
    return `rotate(${el.rotation} ${b.x + b.w / 2} ${b.y + b.h / 2})`
  })()
  switch (el.type) {
    case 'path':
      return (
        <g data-id={el.id} opacity={opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            <path d={pathData(el.points)} fill="none" stroke="transparent" strokeWidth={Math.max(12, el.width + 8)} strokeLinecap="round" />
            <path
              d={pathData(el.points)}
              fill="none"
              stroke={stroke}
              strokeWidth={el.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashArray(el.strokeStyle, el.width)}
            />
          </AnimatedGroup>
        </g>
      )
    case 'rect':
    case 'ellipse':
    case 'diamond': {
      const fillBase = el.fillColor ?? (el.color === INK ? '#64748b' : el.color)
      const depth = el.depth ?? 0
      const fill = el.fill ? withAlpha(fillBase, depth > 0 ? 'd9' : '38') : depth > 0 ? 'rgb(var(--surface))' : 'transparent'
      const rad = ((el.depthAngle ?? 35) * Math.PI) / 180
      const dx = Math.round(Math.cos(rad) * depth)
      const dy = Math.round(Math.sin(rad) * depth)
      const sideFill = withAlpha(fillBase, '55')
      const corners: [number, number, number, number] = el.corners ?? [el.rx ?? 8, el.rx ?? 8, el.rx ?? 8, el.rx ?? 8]
      const hasCustomCorners = !!el.corners && new Set(el.corners).size > 1
      const rectD = (ox: number, oy: number) => roundedRectPath(el.x + ox, el.y + oy, el.w, el.h, corners)
      const common = {
        stroke,
        strokeWidth: el.width,
        fill,
        strokeLinejoin: 'round' as const,
        strokeLinecap: 'round' as const,
        strokeDasharray: dashArray(el.strokeStyle, el.width)
      }
      const sideCommon = {
        stroke,
        strokeWidth: Math.max(1, el.width * 0.85),
        fill: sideFill,
        strokeLinejoin: 'round' as const
      }
      const label = el.text && !hideText ? wrapLines(el.text, Math.max(4, Math.floor(el.w / 9))) : null
      const edgeX = dx >= 0 ? el.x + el.w : el.x
      const edgeY = dy >= 0 ? el.y + el.h : el.y
      return (
        <g data-id={el.id} opacity={opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            {depth > 0 && el.type === 'rect' && (
              <>
                {hasCustomCorners ? (
                  <path d={rectD(dx, dy)} {...sideCommon} />
                ) : (
                  <rect x={el.x + dx} y={el.y + dy} width={el.w} height={el.h} rx={corners[0]} {...sideCommon} />
                )}
                <polygon points={`${edgeX},${el.y} ${edgeX + dx},${el.y + dy} ${edgeX + dx},${el.y + el.h + dy} ${edgeX},${el.y + el.h}`} {...sideCommon} />
                <polygon points={`${el.x},${edgeY} ${el.x + el.w},${edgeY} ${el.x + el.w + dx},${edgeY + dy} ${el.x + dx},${edgeY + dy}`} {...sideCommon} />
              </>
            )}
            {depth > 0 && el.type === 'ellipse' && (() => {
              const ecx = el.x + el.w / 2
              const ecy = el.y + el.h / 2
              const rx = el.w / 2
              const ry = el.h / 2
              const perp = rad + Math.PI / 2
              const tx = Math.cos(perp) * rx
              const ty = Math.sin(perp) * ry
              return (
                <>
                  <ellipse cx={ecx + dx} cy={ecy + dy} rx={rx} ry={ry} {...sideCommon} />
                  <polygon
                    points={`${ecx + tx},${ecy + ty} ${ecx + tx + dx},${ecy + ty + dy} ${ecx - tx + dx},${ecy - ty + dy} ${ecx - tx},${ecy - ty}`}
                    {...sideCommon}
                  />
                </>
              )
            })()}
            {depth > 0 && el.type === 'diamond' && (
              <>
                <polygon
                  points={`${el.x + el.w / 2 + dx},${el.y + dy} ${el.x + el.w + dx},${el.y + el.h / 2 + dy} ${el.x + el.w / 2 + dx},${el.y + el.h + dy} ${el.x + dx},${el.y + el.h / 2 + dy}`}
                  {...sideCommon}
                />
                <polygon
                  points={`${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w + dx},${el.y + el.h / 2 + dy} ${el.x + el.w / 2 + dx},${el.y + el.h + dy} ${el.x + el.w / 2},${el.y + el.h}`}
                  {...sideCommon}
                />
                <polygon
                  points={`${el.x + el.w / 2},${el.y + el.h} ${el.x + el.w / 2 + dx},${el.y + el.h + dy} ${el.x + dx},${el.y + el.h / 2 + dy} ${el.x},${el.y + el.h / 2}`}
                  {...sideCommon}
                />
              </>
            )}
            {el.type === 'rect' && (hasCustomCorners ? <path d={rectD(0, 0)} {...common} /> : <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={corners[0]} {...common} />)}
            {el.type === 'ellipse' && <ellipse cx={el.x + el.w / 2} cy={el.y + el.h / 2} rx={el.w / 2} ry={el.h / 2} {...common} />}
            {el.type === 'diamond' && (
              <polygon points={`${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w / 2},${el.y + el.h} ${el.x},${el.y + el.h / 2}`} {...common} />
            )}
            {label && (
              <Lines lines={label} x={el.x + el.w / 2} y={el.y + el.h / 2 - ((label.length - 1) * 16 * 1.3) / 2 + 5} size={16} color={stroke} anchor="middle" weight={500} />
            )}
          </AnimatedGroup>
        </g>
      )
    }
    case 'arrow':
    case 'line': {
      const curved = el.cx !== undefined && el.cy !== undefined
      const d = curved ? `M${el.x1} ${el.y1} Q${el.cx} ${el.cy} ${el.x2} ${el.y2}` : `M${el.x1} ${el.y1} L${el.x2} ${el.y2}`
      const headStartX = curved ? el.cx! : el.x1
      const headStartY = curved ? el.cy! : el.y1
      return (
        <g data-id={el.id} opacity={opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(12, el.width + 8)} strokeLinecap="round" />
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={el.width}
              strokeLinecap="round"
              strokeDasharray={dashArray(el.strokeStyle, el.width)}
            />
            {el.type === 'arrow' && <polygon points={arrowHead(headStartX, headStartY, el.x2, el.y2, el.width)} fill={stroke} stroke={stroke} strokeWidth={el.width} strokeLinejoin="round" />}
          </AnimatedGroup>
        </g>
      )
    }
    case 'text':
      return (
        <g data-id={el.id} opacity={hideText ? 0 : opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            <Lines lines={el.text.split('\n')} x={el.x} y={el.y + el.size} size={el.size} color={stroke} weight={500} />
          </AnimatedGroup>
        </g>
      )
    case 'sticky': {
      const lines = hideText ? [] : wrapLines(el.text, Math.max(6, Math.floor((el.w - 24) / 8)))
      return (
        <g data-id={el.id} opacity={opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            <rect x={el.x + 2} y={el.y + 4} width={el.w} height={el.h} rx={6} fill="#000" opacity={0.08} />
            <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={6} fill={el.color} />
            <Lines lines={lines} x={el.x + 12} y={el.y + 26} size={14} color={INK} />
          </AnimatedGroup>
        </g>
      )
    }
    case 'image': {
      const rx = el.rx ?? 0
      const clipId = rx > 0 ? `wb-clip-${el.id}` : undefined
      return (
        <g data-id={el.id} opacity={opacity} transform={rotateTransform}>
          <AnimatedGroup el={el}>
            {clipId && (
              <defs>
                <clipPath id={clipId}>
                  <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={rx} />
                </clipPath>
              </defs>
            )}
            <image
              href={el.src}
              x={el.x}
              y={el.y}
              width={el.w}
              height={el.h}
              preserveAspectRatio="none"
              clipPath={clipId ? `url(#${clipId})` : undefined}
            />
          </AnimatedGroup>
        </g>
      )
    }
  }
}

export default React.memo(WbElementView)
