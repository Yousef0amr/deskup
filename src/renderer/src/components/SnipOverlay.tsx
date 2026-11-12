import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Highlighter,
  Type,
  Undo2,
  Copy,
  Save,
  X
} from 'lucide-react'

type SnipTool = 'select' | 'pen' | 'line' | 'arrow' | 'rect' | 'highlighter' | 'text'
type Rect = { x: number; y: number; w: number; h: number }
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

type Annotation =
  | { kind: 'pen' | 'highlighter'; color: string; points: [number, number][] }
  | { kind: 'line' | 'arrow' | 'rect'; color: string; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'text'; color: string; x: number; y: number; text: string }

type DragState =
  | { mode: 'create'; sx: number; sy: number }
  | { mode: 'move'; sx: number; sy: number; start: Rect }
  | { mode: 'resize'; handle: Handle; sx: number; sy: number; start: Rect }
  | { mode: 'draw'; item: Annotation }

function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

function clampRect(r: Rect, maxW: number, maxH: number): Rect {
  const x = Math.max(0, Math.min(maxW - 1, r.x))
  const y = Math.max(0, Math.min(maxH - 1, r.y))
  const w = Math.max(1, Math.min(maxW - x, r.w))
  const h = Math.max(1, Math.min(maxH - y, r.h))
  return { x, y, w, h }
}

function arrowHeadPoints(x1: number, y1: number, x2: number, y2: number, size = 12): string {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const spread = Math.PI / 7
  const ax = x2 - size * Math.cos(angle - spread)
  const ay = y2 - size * Math.sin(angle - spread)
  const bx = x2 - size * Math.cos(angle + spread)
  const by = y2 - size * Math.sin(angle + spread)
  return `${x2},${y2} ${ax},${ay} ${bx},${by}`
}

function drawAnnotationToCtx(ctx: CanvasRenderingContext2D, item: Annotation, ox: number, oy: number): void {
  ctx.save()
  if (item.kind === 'pen' || item.kind === 'highlighter') {
    if (item.points.length < 1) {
      ctx.restore()
      return
    }
    ctx.strokeStyle = item.color
    ctx.lineWidth = item.kind === 'highlighter' ? 16 : 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = item.kind === 'highlighter' ? 0.35 : 1
    ctx.beginPath()
    ctx.moveTo(item.points[0][0] - ox, item.points[0][1] - oy)
    for (let i = 1; i < item.points.length; i++) {
      ctx.lineTo(item.points[i][0] - ox, item.points[i][1] - oy)
    }
    ctx.stroke()
  } else if (item.kind === 'rect') {
    const r = normalizeRect(item.x1 - ox, item.y1 - oy, item.x2 - ox, item.y2 - oy)
    ctx.strokeStyle = item.color
    ctx.lineWidth = 2.5
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  } else if (item.kind === 'line' || item.kind === 'arrow') {
    const x1 = item.x1 - ox
    const y1 = item.y1 - oy
    const x2 = item.x2 - ox
    const y2 = item.y2 - oy
    ctx.strokeStyle = item.color
    ctx.fillStyle = item.color
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    if (item.kind === 'arrow') {
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const size = 12
      const spread = Math.PI / 7
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - size * Math.cos(angle - spread), y2 - size * Math.sin(angle - spread))
      ctx.lineTo(x2 - size * Math.cos(angle + spread), y2 - size * Math.sin(angle + spread))
      ctx.closePath()
      ctx.fill()
    }
  } else if (item.kind === 'text') {
    ctx.fillStyle = item.color
    ctx.font = '600 16px "Segoe UI", system-ui, sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(item.text, item.x - ox, item.y - oy)
  }
  ctx.restore()
}

export default function SnipOverlay(): React.JSX.Element {
  const [capture, setCapture] = useState<{ dataUrl: string; width: number; height: number } | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [tool, setTool] = useState<SnipTool>('select')
  const [color, setColor] = useState('#ef4444')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    window.deskup.snip.getCapture().then((c) => {
      if (c) setCapture(c)
    })
  }, [])

  const closeOverlay = useCallback(() => {
    void window.deskup.snip.close()
  }, [])

  const renderCroppedPng = useCallback(async (): Promise<string | null> => {
    if (!capture || !selection || selection.w < 2 || selection.h < 2) return null
    const img = new Image()
    img.src = capture.dataUrl
    await img.decode()

    const scaleX = img.naturalWidth / capture.width
    const scaleY = img.naturalHeight / capture.height

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(selection.w * scaleX))
    canvas.height = Math.max(1, Math.round(selection.h * scaleY))
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(
      img,
      selection.x * scaleX,
      selection.y * scaleY,
      selection.w * scaleX,
      selection.h * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )
    ctx.scale(scaleX, scaleY)
    for (const item of annotations) {
      drawAnnotationToCtx(ctx, item, selection.x, selection.y)
    }
    return canvas.toDataURL('image/png')
  }, [annotations, capture, selection])

  const handleCopy = useCallback(async () => {
    const dataUrl = await renderCroppedPng()
    if (!dataUrl) return
    await window.deskup.clipboard.copyImageData(dataUrl)
    closeOverlay()
  }, [closeOverlay, renderCroppedPng])

  const handleSave = useCallback(async () => {
    const dataUrl = await renderCroppedPng()
    if (!dataUrl) return
    const saved = await window.deskup.snip.saveImage(dataUrl)
    if (saved) closeOverlay()
  }, [closeOverlay, renderCroppedPng])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (textInput) return
      if (e.key === 'Escape') {
        e.preventDefault()
        closeOverlay()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        setAnnotations((prev) => prev.slice(0, -1))
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        void handleCopy()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      } else if (e.key === 'Enter' && selection) {
        e.preventDefault()
        void handleCopy()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeOverlay, handleCopy, handleSave, selection, textInput])

  if (!capture) {
    return <div className="h-screen w-screen bg-black/80" />
  }

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || textInput) return
    const x = e.clientX
    const y = e.clientY

    if (!selection) {
      dragRef.current = { mode: 'create', sx: x, sy: y }
      setSelection({ x, y, w: 1, h: 1 })
      return
    }

    const inside = x >= selection.x && x <= selection.x + selection.w && y >= selection.y && y <= selection.y + selection.h
    if (!inside) {
      setAnnotations([])
      setTool('select')
      dragRef.current = { mode: 'create', sx: x, sy: y }
      setSelection({ x, y, w: 1, h: 1 })
      return
    }

    if (tool === 'select') {
      dragRef.current = { mode: 'move', sx: x, sy: y, start: selection }
      return
    }

    if (tool === 'text') {
      setTextInput({ x, y, value: '' })
      return
    }

    const item: Annotation =
      tool === 'pen' || tool === 'highlighter'
        ? { kind: tool, color, points: [[x, y]] }
        : { kind: tool, color, x1: x, y1: y, x2: x, y2: y }
    dragRef.current = { mode: 'draw', item }
    setDraft(item)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const x = e.clientX
    const y = e.clientY

    if (d.mode === 'create') {
      setSelection(clampRect(normalizeRect(d.sx, d.sy, x, y), capture.width, capture.height))
    } else if (d.mode === 'move') {
      const dx = x - d.sx
      const dy = y - d.sy
      setSelection({
        x: Math.max(0, Math.min(capture.width - d.start.w, d.start.x + dx)),
        y: Math.max(0, Math.min(capture.height - d.start.h, d.start.y + dy)),
        w: d.start.w,
        h: d.start.h
      })
    } else if (d.mode === 'resize') {
      const dx = x - d.sx
      const dy = y - d.sy
      let { x: rx, y: ry, w: rw, h: rh } = d.start
      if (d.handle.includes('e')) rw = Math.max(10, d.start.w + dx)
      if (d.handle.includes('s')) rh = Math.max(10, d.start.h + dy)
      if (d.handle.includes('w')) {
        const nextW = Math.max(10, d.start.w - dx)
        rx = d.start.x + (d.start.w - nextW)
        rw = nextW
      }
      if (d.handle.includes('n')) {
        const nextH = Math.max(10, d.start.h - dy)
        ry = d.start.y + (d.start.h - nextH)
        rh = nextH
      }
      setSelection(clampRect({ x: rx, y: ry, w: rw, h: rh }, capture.width, capture.height))
    } else if (d.mode === 'draw') {
      if (d.item.kind === 'pen' || d.item.kind === 'highlighter') {
        const next: Annotation = { ...d.item, points: [...d.item.points, [x, y]] }
        d.item = next
        setDraft(next)
      } else if (d.item.kind === 'line' || d.item.kind === 'arrow' || d.item.kind === 'rect') {
        const next: Annotation = { ...d.item, x2: x, y2: y }
        d.item = next
        setDraft(next)
      }
    }
  }

  const onPointerUp = () => {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    if (d.mode === 'draw') {
      setAnnotations((prev) => [...prev, d.item])
      setDraft(null)
    }
  }

  const startResize = (handle: Handle, e: React.PointerEvent) => {
    e.stopPropagation()
    if (!selection) return
    dragRef.current = { mode: 'resize', handle, sx: e.clientX, sy: e.clientY, start: selection }
  }

  const renderAnnotationSvg = (item: Annotation, key: string | number) => {
    if (item.kind === 'pen' || item.kind === 'highlighter') {
      const d = item.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
      return (
        <path
          key={key}
          d={d}
          fill="none"
          stroke={item.color}
          strokeWidth={item.kind === 'highlighter' ? 16 : 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={item.kind === 'highlighter' ? 0.35 : 1}
        />
      )
    }
    if (item.kind === 'rect') {
      const r = normalizeRect(item.x1, item.y1, item.x2, item.y2)
      return <rect key={key} x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={item.color} strokeWidth={2.5} />
    }
    if (item.kind === 'line' || item.kind === 'arrow') {
      return (
        <g key={key}>
          <line x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke={item.color} strokeWidth={2.5} strokeLinecap="round" />
          {item.kind === 'arrow' && <polygon points={arrowHeadPoints(item.x1, item.y1, item.x2, item.y2)} fill={item.color} />}
        </g>
      )
    }
    if (item.kind === 'text') {
      return (
        <text key={key} x={item.x} y={item.y + 14} fill={item.color} fontSize={16} fontWeight={600} fontFamily="Segoe UI, system-ui, sans-serif">
          {item.text}
        </text>
      )
    }
    return null
  }

  // Toolbar positions kept inside screen bounds
  const sideBarLeft = selection ? (selection.x + selection.w + 46 < capture.width ? selection.x + selection.w + 8 : Math.max(8, selection.x - 44)) : 0
  const sideBarTop = selection ? Math.min(capture.height - 270, Math.max(8, selection.y)) : 0
  const bottomBarLeft = selection ? Math.max(8, Math.min(capture.width - 140, selection.x + selection.w - 118)) : 0
  const bottomBarTop = selection ? (selection.y + selection.h + 44 < capture.height ? selection.y + selection.h + 8 : Math.max(8, selection.y - 42)) : 0

  const HANDLES: { h: Handle; cls: string; cursor: string }[] = [
    { h: 'nw', cls: '-left-1 -top-1', cursor: 'nwse-resize' },
    { h: 'n', cls: 'left-1/2 -top-1 -translate-x-1/2', cursor: 'ns-resize' },
    { h: 'ne', cls: '-right-1 -top-1', cursor: 'nesw-resize' },
    { h: 'e', cls: '-right-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { h: 'se', cls: '-right-1 -bottom-1', cursor: 'nwse-resize' },
    { h: 's', cls: 'left-1/2 -bottom-1 -translate-x-1/2', cursor: 'ns-resize' },
    { h: 'sw', cls: '-left-1 -bottom-1', cursor: 'nesw-resize' },
    { h: 'w', cls: '-left-1 top-1/2 -translate-y-1/2', cursor: 'ew-resize' }
  ]

  return (
    <div
      className="relative h-screen w-screen overflow-hidden select-none"
      style={{ cursor: tool === 'select' ? 'crosshair' : 'crosshair' }}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img src={capture.dataUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-fill" />

      {/* Dimmed overlay */}
      {!selection ? (
        <div className="pointer-events-none absolute inset-0 bg-black/45 flex items-center justify-center">
          <div className="rounded-lg bg-black/75 px-4 py-2 text-xs text-white shadow-lg">
            Drag to select an area · Esc to cancel
          </div>
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute left-0 top-0 right-0 bg-black/45" style={{ height: selection.y }} />
          <div className="pointer-events-none absolute left-0 right-0 bottom-0 bg-black/45" style={{ top: selection.y + selection.h }} />
          <div className="pointer-events-none absolute left-0 bg-black/45" style={{ top: selection.y, height: selection.h, width: selection.x }} />
          <div className="pointer-events-none absolute right-0 bg-black/45" style={{ top: selection.y, height: selection.h, left: selection.x + selection.w }} />

          {/* Annotations SVG */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            {annotations.map((a, i) => renderAnnotationSvg(a, i))}
            {draft && renderAnnotationSvg(draft, 'draft')}
          </svg>

          {/* Selection border + handles */}
          <div
            className="absolute border border-dashed border-white"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
              cursor: tool === 'select' ? 'move' : 'crosshair'
            }}
          >
            <div className="pointer-events-none absolute -top-6 left-0 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
              {Math.round(selection.w)}×{Math.round(selection.h)}
            </div>
            {HANDLES.map(({ h, cls, cursor }) => (
              <div
                key={h}
                onPointerDown={(e) => startResize(h, e)}
                className={`absolute h-2 w-2 border border-zinc-800 bg-white ${cls}`}
                style={{ cursor }}
              />
            ))}
          </div>

          {/* Inline text input */}
          {textInput && (
            <input
              autoFocus
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput((t) => (t ? { ...t, value: e.target.value } : null))}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && textInput.value.trim()) {
                  setAnnotations((prev) => [...prev, { kind: 'text', color, x: textInput.x, y: textInput.y, text: textInput.value.trim() }])
                  setTextInput(null)
                } else if (e.key === 'Escape') {
                  setTextInput(null)
                }
              }}
              onBlur={() => {
                if (textInput.value.trim()) {
                  setAnnotations((prev) => [...prev, { kind: 'text', color, x: textInput.x, y: textInput.y, text: textInput.value.trim() }])
                }
                setTextInput(null)
              }}
              placeholder="Type…"
              className="absolute z-30 min-w-[120px] rounded border border-white/80 bg-black/75 px-1.5 py-0.5 text-sm font-semibold outline-none"
              style={{ left: textInput.x, top: textInput.y, color }}
            />
          )}

          {/* Right-side annotation toolbar */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-20 flex flex-col items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 p-1 text-zinc-700 shadow-xl"
            style={{ left: sideBarLeft, top: sideBarTop }}
          >
            {([
              ['pen', Pencil, 'Pen'],
              ['line', Minus, 'Line'],
              ['arrow', ArrowUpRight, 'Arrow'],
              ['rect', Square, 'Rectangle'],
              ['highlighter', Highlighter, 'Highlighter'],
              ['text', Type, 'Text']
            ] as [SnipTool, React.ComponentType<{ className?: string }>, string][]).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setTool((t) => (t === id ? 'select' : id))}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  tool === id ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-200'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-zinc-400" style={{ background: color }} title="Color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              disabled={annotations.length === 0}
              onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-zinc-200 disabled:opacity-35"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom action toolbar */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-20 flex items-center gap-1 rounded-md border border-zinc-300 bg-zinc-100 p-1 text-zinc-700 shadow-xl"
            style={{ left: bottomBarLeft, top: bottomBarTop }}
          >
            <button type="button" title="Copy (Ctrl+C)" onClick={() => void handleCopy()} className="flex h-7 items-center gap-1 rounded px-2 text-xs font-medium hover:bg-zinc-200">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Save (Ctrl+S)" onClick={() => void handleSave()} className="flex h-7 items-center gap-1 rounded px-2 text-xs font-medium hover:bg-zinc-200">
              <Save className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Close (Esc)" onClick={closeOverlay} className="flex h-7 items-center rounded px-2 text-xs font-medium hover:bg-rose-100 hover:text-rose-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
