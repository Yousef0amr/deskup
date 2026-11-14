import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  MousePointer2,
  Pencil,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Highlighter,
  Type,
  Grid2x2,
  ListOrdered,
  Undo2,
  Redo2,
  Copy,
  Save,
  Pin,
  ScanText,
  Maximize,
  X,
  Loader2
} from 'lucide-react'
import type { SnipBegin, SnipFrame } from '../../../shared/types'

/* ------------------------------------------------------------------ types */

type Tool = 'select' | 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'highlighter' | 'text' | 'pixelate' | 'step'
type Rect = { x: number; y: number; w: number; h: number }
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type Size = 1 | 2 | 3

type Annotation =
  | { kind: 'pen' | 'highlighter'; color: string; size: Size; points: [number, number][] }
  | { kind: 'line' | 'arrow' | 'rect' | 'ellipse' | 'pixelate'; color: string; size: Size; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'text'; color: string; size: Size; x: number; y: number; text: string }
  | { kind: 'step'; color: string; size: Size; x: number; y: number; n: number }

type DragState =
  | { mode: 'create'; sx: number; sy: number; moved: boolean }
  | { mode: 'move'; sx: number; sy: number; start: Rect }
  | { mode: 'resize'; handle: Handle; sx: number; sy: number; start: Rect }
  | { mode: 'draw'; item: Annotation }
  | { mode: 'text'; x: number; y: number }

type TextEditor = { x: number; y: number; value: string; color: string; size: Size }

/* --------------------------------------------------------------- constants */

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#111111']
const STROKE: Record<Size, number> = { 1: 2, 2: 4, 3: 7 }
const FONT: Record<Size, number> = { 1: 16, 2: 22, 3: 32 }
const STEP_RADIUS: Record<Size, number> = { 1: 11, 2: 14, 3: 19 }
const PIXEL_BLOCK = 10
const FONT_FAMILY = '"Segoe UI", system-ui, sans-serif'
const TEXT_LINE_HEIGHT = 1.25

const TOOLS: { id: Tool; icon: React.ComponentType<{ className?: string }>; label: string; key: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Move selection', key: 'V' },
  { id: 'pen', icon: Pencil, label: 'Pen', key: 'P' },
  { id: 'line', icon: Minus, label: 'Line', key: 'L' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', key: 'A' },
  { id: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', key: 'E' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter', key: 'H' },
  { id: 'text', icon: Type, label: 'Text', key: 'T' },
  { id: 'pixelate', icon: Grid2x2, label: 'Pixelate (hide private info)', key: 'B' },
  { id: 'step', icon: ListOrdered, label: 'Numbered steps', key: 'N' }
]
const TOOL_BY_KEY = new Map(TOOLS.map((t) => [t.key.toLowerCase(), t.id]))

const HANDLES: { h: Handle; cls: string; cursor: string }[] = [
  { h: 'nw', cls: '-left-[5px] -top-[5px]', cursor: 'nwse-resize' },
  { h: 'n', cls: 'left-1/2 -top-[5px] -translate-x-1/2', cursor: 'ns-resize' },
  { h: 'ne', cls: '-right-[5px] -top-[5px]', cursor: 'nesw-resize' },
  { h: 'e', cls: '-right-[5px] top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { h: 'se', cls: '-right-[5px] -bottom-[5px]', cursor: 'nwse-resize' },
  { h: 's', cls: 'left-1/2 -bottom-[5px] -translate-x-1/2', cursor: 'ns-resize' },
  { h: 'sw', cls: '-left-[5px] -bottom-[5px]', cursor: 'nesw-resize' },
  { h: 'w', cls: '-left-[5px] top-1/2 -translate-y-1/2', cursor: 'ew-resize' }
]

/* ----------------------------------------------------------------- helpers */

function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

function clampRect(r: Rect, maxW: number, maxH: number): Rect {
  const x = Math.max(0, Math.min(maxW - 1, r.x))
  const y = Math.max(0, Math.min(maxH - 1, r.y))
  return { x, y, w: Math.max(1, Math.min(maxW - x, r.w)), h: Math.max(1, Math.min(maxH - y, r.h)) }
}

function textFont(size: Size): string {
  return `600 ${FONT[size]}px ${FONT_FAMILY}`
}

/** Bounding box of a text annotation, measured with the same font the canvas uses. */
function textBounds(ctx: CanvasRenderingContext2D, item: Extract<Annotation, { kind: 'text' }>): Rect {
  ctx.save()
  ctx.font = textFont(item.size)
  const lines = item.text.split('\n')
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width))
  ctx.restore()
  return { x: item.x, y: item.y, w, h: lines.length * FONT[item.size] * TEXT_LINE_HEIGHT }
}

/** Convert the main process' BGRA frame into a canvas we can draw and sample from. */
function frameToCanvas(frame: SnipFrame): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const data = new Uint8ClampedArray(frame.width * frame.height * 4)
  const src = frame.pixels
  for (let i = 0; i < data.length; i += 4) {
    data[i] = src[i + 2]
    data[i + 1] = src[i + 1]
    data[i + 2] = src[i]
    data[i + 3] = 255
  }
  ctx.putImageData(new ImageData(data, frame.width, frame.height), 0, 0)
  return canvas
}

/**
 * Draw one annotation. The context must already map overlay CSS pixels to the target
 * (screen canvas or exported image); `base` + `imgScale` let pixelate sample the capture.
 */
function drawAnnotation(ctx: CanvasRenderingContext2D, item: Annotation, base: HTMLCanvasElement | null, imgScale: number): void {
  ctx.save()
  ctx.strokeStyle = item.color
  ctx.fillStyle = item.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const stroke = STROKE[item.size]

  switch (item.kind) {
    case 'pen':
    case 'highlighter': {
      if (item.points.length === 0) break
      ctx.lineWidth = item.kind === 'highlighter' ? stroke * 4 + 6 : stroke
      if (item.kind === 'highlighter') {
        ctx.globalAlpha = 0.35
        ctx.lineCap = 'butt'
      }
      ctx.beginPath()
      ctx.moveTo(item.points[0][0], item.points[0][1])
      if (item.points.length === 1) ctx.lineTo(item.points[0][0] + 0.01, item.points[0][1])
      for (let i = 1; i < item.points.length; i++) ctx.lineTo(item.points[i][0], item.points[i][1])
      ctx.stroke()
      break
    }
    case 'line':
    case 'arrow': {
      ctx.lineWidth = stroke
      const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1)
      const head = 10 + stroke * 2.2
      // Stop the shaft short of the tip so it doesn't poke through the arrowhead.
      const endX = item.kind === 'arrow' ? item.x2 - Math.cos(angle) * head * 0.6 : item.x2
      const endY = item.kind === 'arrow' ? item.y2 - Math.sin(angle) * head * 0.6 : item.y2
      ctx.beginPath()
      ctx.moveTo(item.x1, item.y1)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      if (item.kind === 'arrow') {
        const spread = Math.PI / 7
        ctx.beginPath()
        ctx.moveTo(item.x2, item.y2)
        ctx.lineTo(item.x2 - head * Math.cos(angle - spread), item.y2 - head * Math.sin(angle - spread))
        ctx.lineTo(item.x2 - head * Math.cos(angle + spread), item.y2 - head * Math.sin(angle + spread))
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'rect': {
      const r = normalizeRect(item.x1, item.y1, item.x2, item.y2)
      ctx.lineWidth = stroke
      ctx.strokeRect(r.x, r.y, r.w, r.h)
      break
    }
    case 'ellipse': {
      const r = normalizeRect(item.x1, item.y1, item.x2, item.y2)
      ctx.lineWidth = stroke
      ctx.beginPath()
      ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'pixelate': {
      const r = normalizeRect(item.x1, item.y1, item.x2, item.y2)
      if (r.w < 1 || r.h < 1) break
      if (!base) {
        ctx.fillStyle = 'rgba(128,128,128,0.6)'
        ctx.fillRect(r.x, r.y, r.w, r.h)
        break
      }
      const cols = Math.max(1, Math.round(r.w / PIXEL_BLOCK))
      const rows = Math.max(1, Math.round(r.h / PIXEL_BLOCK))
      const tiny = document.createElement('canvas')
      tiny.width = cols
      tiny.height = rows
      const tctx = tiny.getContext('2d')!
      tctx.imageSmoothingEnabled = true
      tctx.drawImage(base, r.x * imgScale, r.y * imgScale, r.w * imgScale, r.h * imgScale, 0, 0, cols, rows)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tiny, 0, 0, cols, rows, r.x, r.y, r.w, r.h)
      break
    }
    case 'text': {
      ctx.font = textFont(item.size)
      ctx.textBaseline = 'top'
      const lh = FONT[item.size] * TEXT_LINE_HEIGHT
      // Half-leading offset matches how the textarea positions its glyphs.
      const pad = (lh - FONT[item.size]) / 2
      item.text.split('\n').forEach((line, i) => ctx.fillText(line, item.x, item.y + pad + i * lh))
      break
    }
    case 'step': {
      const radius = STEP_RADIUS[item.size]
      ctx.beginPath()
      ctx.arc(item.x, item.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()
      ctx.fillStyle = isLight(item.color) ? '#111111' : '#ffffff'
      ctx.font = `700 ${Math.round(radius * 1.15)}px ${FONT_FAMILY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(item.n), item.x, item.y + 1)
      break
    }
  }
  ctx.restore()
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

/* --------------------------------------------------------------- component */

export default function SnipOverlay(): React.JSX.Element {
  const [view, setView] = useState<SnipBegin | null>(null)
  const [base, setBase] = useState<HTMLCanvasElement | null>(null)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState<Size>(2)
  const [history, setHistory] = useState<{ items: Annotation[]; redo: Annotation[] }>({ items: [], redo: [] })
  const annotations = history.items
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [editor, setEditor] = useState<TextEditor | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const sessionRef = useRef(0)
  const baseWaiters = useRef<((c: HTMLCanvasElement) => void)[]>([])
  const measureCtx = useMemo(() => document.createElement('canvas').getContext('2d')!, [])

  const viewW = view?.width ?? window.innerWidth
  const viewH = view?.height ?? window.innerHeight
  const imgScale = base ? base.width / viewW : 1
  const nextStep = annotations.filter((a) => a.kind === 'step').length + 1

  /* ---- lifecycle: the window is reused, so all state resets per snip ---- */

  const resetState = useCallback(() => {
    setBase(null)
    setSelection(null)
    setTool('select')
    setHistory({ items: [], redo: [] })
    setDraft(null)
    setEditor(null)
    setCursor(null)
    setBusy(null)
    setNotice(null)
    dragRef.current = null
  }, [])

  useEffect(() => {
    const offBegin = window.deskup.snip.onBegin((begin) => {
      sessionRef.current = begin.session
      resetState()
      setView(begin)
    })
    const offFrame = window.deskup.snip.onFrame((frame) => {
      if (frame.session !== sessionRef.current) return
      const canvas = frameToCanvas(frame)
      setBase(canvas)
      baseWaiters.current.splice(0).forEach((resolve) => resolve(canvas))
    })
    const offReset = window.deskup.snip.onReset(() => {
      sessionRef.current = -1
      resetState()
      setView(null)
    })
    window.deskup.snip.ready()
    return () => {
      offBegin()
      offFrame()
      offReset()
    }
  }, [resetState])

  const waitForBase = useCallback((): Promise<HTMLCanvasElement> => {
    if (base) return Promise.resolve(base)
    return new Promise((resolve) => baseWaiters.current.push(resolve))
  }, [base])

  const closeOverlay = useCallback(() => {
    void window.deskup.snip.close()
  }, [])

  /* ---- drawing the screen canvas ---- */

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !view) return
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(viewW * dpr)
    const h = Math.round(viewH * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (base) ctx.drawImage(base, 0, 0, viewW, viewH)

    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    if (!selection) {
      ctx.fillRect(0, 0, viewW, viewH)
      return
    }
    const s = selection
    ctx.fillRect(0, 0, viewW, s.y)
    ctx.fillRect(0, s.y + s.h, viewW, viewH - s.y - s.h)
    ctx.fillRect(0, s.y, s.x, s.h)
    ctx.fillRect(s.x + s.w, s.y, viewW - s.x - s.w, s.h)

    ctx.save()
    ctx.beginPath()
    ctx.rect(s.x, s.y, s.w, s.h)
    ctx.clip()
    for (const a of annotations) drawAnnotation(ctx, a, base, imgScale)
    if (draft) drawAnnotation(ctx, draft, base, imgScale)
    ctx.restore()
  }, [annotations, base, draft, imgScale, selection, view, viewH, viewW])

  // The window is shown only once the frozen frame is on the canvas (no flash of the
  // previous snip or an empty window). The layout effect above has drawn it synchronously;
  // rAF can't be used here because a hidden window gets no animation frames.
  useEffect(() => {
    if (base && view) window.deskup.snip.painted(view.session)
  }, [base, view])

  /* ---- export ---- */

  const renderPng = useCallback(
    async (opts?: { minSide?: number }): Promise<string | null> => {
      if (!selection || selection.w < 2 || selection.h < 2) return null
      const img = await waitForBase()
      const scale = img.width / viewW
      // OCR reads small text far better when it is upscaled first.
      const up = opts?.minSide ? Math.min(4, Math.max(1, opts.minSide / Math.min(selection.w * scale, selection.h * scale))) : 1
      const out = document.createElement('canvas')
      out.width = Math.max(1, Math.round(selection.w * scale * up))
      out.height = Math.max(1, Math.round(selection.h * scale * up))
      const ctx = out.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, selection.x * scale, selection.y * scale, selection.w * scale, selection.h * scale, 0, 0, out.width, out.height)
      ctx.setTransform(scale * up, 0, 0, scale * up, -selection.x * scale * up, -selection.y * scale * up)
      for (const a of annotations) drawAnnotation(ctx, a, img, scale)
      return out.toDataURL('image/png')
    },
    [annotations, selection, viewW, waitForBase]
  )

  const runAction = useCallback(
    async (label: string, fn: () => Promise<boolean | void>) => {
      if (busy) return
      setBusy(label)
      try {
        const done = await fn()
        if (done !== false) closeOverlay()
      } catch (err) {
        setNotice(err instanceof Error ? err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : 'Something went wrong')
      } finally {
        setBusy(null)
      }
    },
    [busy, closeOverlay]
  )

  const handleCopy = useCallback(
    () =>
      runAction('Copying…', async () => {
        const url = await renderPng()
        if (!url) return false
        await window.deskup.snip.copyImage(url)
      }),
    [renderPng, runAction]
  )

  const handleSave = useCallback(
    () =>
      runAction('Saving…', async () => {
        const url = await renderPng()
        if (!url) return false
        return window.deskup.snip.saveImage(url)
      }),
    [renderPng, runAction]
  )

  const handlePin = useCallback(
    () =>
      runAction('Pinning…', async () => {
        const url = await renderPng()
        if (!url || !selection) return false
        await window.deskup.snip.pin(url, { x: selection.x, y: selection.y, width: selection.w, height: selection.h })
      }),
    [renderPng, runAction, selection]
  )

  const handleCopyText = useCallback(
    () =>
      runAction('Reading text…', async () => {
        const url = await renderPng({ minSide: 600 })
        if (!url) return false
        const text = await window.deskup.snip.copyText(url)
        if (!text) {
          setNotice('No text found in the selection')
          return false
        }
        setNotice(`Copied ${text.split('\n').length} line${text.includes('\n') ? 's' : ''} of text`)
        await new Promise((r) => setTimeout(r, 700))
      }),
    [renderPng, runAction]
  )

  const selectAll = useCallback(() => {
    setSelection({ x: 0, y: 0, w: viewW, h: viewH })
  }, [viewH, viewW])

  /* ---- annotations: undo / redo / text ---- */

  const pushAnnotation = useCallback((a: Annotation) => {
    setHistory((h) => ({ items: [...h.items, a], redo: [] }))
  }, [])

  const undo = useCallback(() => {
    setHistory((h) => (h.items.length ? { items: h.items.slice(0, -1), redo: [...h.redo, h.items[h.items.length - 1]] } : h))
  }, [])

  const redo = useCallback(() => {
    setHistory((h) => (h.redo.length ? { items: [...h.items, h.redo[h.redo.length - 1]], redo: h.redo.slice(0, -1) } : h))
  }, [])

  // Read through a ref so a blur and a click committing in the same tick can't add the text twice.
  const editorRef = useRef<TextEditor | null>(null)
  editorRef.current = editor
  const commitEditor = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    editorRef.current = null
    setEditor(null)
    if (ed.value.trim()) {
      pushAnnotation({ kind: 'text', color: ed.color, size: ed.size, x: ed.x, y: ed.y, text: ed.value.replace(/\s+$/, '') })
    }
  }, [pushAnnotation])

  /** Open the text editor at a point, or re-edit an existing text annotation there. */
  const openTextAt = useCallback(
    (x: number, y: number) => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i]
        if (a.kind !== 'text') continue
        const b = textBounds(measureCtx, a)
        if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4) {
          setHistory((h) => ({ items: h.items.filter((_, j) => j !== i), redo: h.redo }))
          setEditor({ x: a.x, y: a.y, value: a.text, color: a.color, size: a.size })
          return
        }
      }
      setEditor({ x, y: y - FONT[size] * TEXT_LINE_HEIGHT * 0.5, value: '', color, size })
    },
    [annotations, color, measureCtx, size]
  )

  /* ---- keyboard ---- */

  useEffect(() => {
    if (!view) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (editor) return // the textarea handles its own keys
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (e.key === 'Escape') {
        e.preventDefault()
        if (tool !== 'select' && selection) setTool('select')
        else closeOverlay()
      } else if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (mod && key === 'a') {
        e.preventDefault()
        selectAll()
      } else if (mod && key === 'c' && selection) {
        e.preventDefault()
        void handleCopy()
      } else if (mod && key === 's' && selection) {
        e.preventDefault()
        void handleSave()
      } else if (mod && key === 'p' && selection) {
        e.preventDefault()
        void handlePin()
      } else if (mod && key === 't' && selection) {
        e.preventDefault()
        void handleCopyText()
      } else if (e.key === 'Enter' && selection) {
        e.preventDefault()
        void handleCopy()
      } else if (!mod && key === 'c' && !selection && cursor && base) {
        // Color picker: copy the hex value under the cursor.
        e.preventDefault()
        const px = base.getContext('2d')!.getImageData(Math.floor(cursor.x * imgScale), Math.floor(cursor.y * imgScale), 1, 1).data
        const hex = toHex(px[0], px[1], px[2])
        void navigator.clipboard.writeText(hex)
        setNotice(`Copied ${hex}`)
      } else if (!mod && !e.altKey && selection && TOOL_BY_KEY.has(key)) {
        e.preventDefault()
        setTool(TOOL_BY_KEY.get(key)!)
      } else if (!mod && selection && ['1', '2', '3'].includes(key)) {
        setSize(Number(key) as Size)
      } else if (selection && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        setSelection((s) =>
          s
            ? e.altKey
              ? clampRect({ ...s, w: Math.max(4, s.w + dx), h: Math.max(4, s.h + dy) }, viewW, viewH)
              : { ...s, x: Math.max(0, Math.min(viewW - s.w, s.x + dx)), y: Math.max(0, Math.min(viewH - s.h, s.y + dy)) }
            : s
        )
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [base, closeOverlay, cursor, editor, handleCopy, handleCopyText, handlePin, handleSave, imgScale, redo, selectAll, selection, tool, undo, view, viewH, viewW])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(t)
  }, [notice])

  if (!view) return <div className="h-screen w-screen" />

  /* ---- pointer handling ---- */

  const inside = (x: number, y: number) =>
    !!selection && x >= selection.x && x <= selection.x + selection.w && y >= selection.y && y <= selection.y + selection.h

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    if (editor) {
      // Clicking anywhere else finishes the current text.
      commitEditor()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const x = e.clientX
    const y = e.clientY

    if (!selection || !inside(x, y)) {
      // The old area stays until the pointer actually drags out a new one.
      dragRef.current = { mode: 'create', sx: x, sy: y, moved: false }
      return
    }

    if (tool === 'select') {
      dragRef.current = { mode: 'move', sx: x, sy: y, start: selection }
    } else if (tool === 'text') {
      // Open the editor on pointer *up*: opening it on pointer down lets the browser's
      // default mousedown focus handling immediately blur (and discard) the new textarea.
      dragRef.current = { mode: 'text', x, y }
    } else if (tool === 'step') {
      pushAnnotation({ kind: 'step', color, size, x, y, n: nextStep })
    } else {
      const item: Annotation =
        tool === 'pen' || tool === 'highlighter'
          ? { kind: tool, color, size, points: [[x, y]] }
          : { kind: tool, color, size, x1: x, y1: y, x2: x, y2: y }
      dragRef.current = { mode: 'draw', item }
      setDraft(item)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const x = e.clientX
    const y = e.clientY
    const d = dragRef.current
    if (!selection || (d?.mode === 'create' && d.moved)) setCursor({ x, y })
    if (!d) return

    if (d.mode === 'create') {
      if (d.moved || Math.abs(x - d.sx) > 3 || Math.abs(y - d.sy) > 3) {
        if (!d.moved) {
          // Dragging out a new area replaces the old one and its drawings.
          d.moved = true
          setHistory({ items: [], redo: [] })
        }
        setSelection(clampRect(normalizeRect(d.sx, d.sy, x, y), viewW, viewH))
      }
    } else if (d.mode === 'move') {
      setSelection({
        x: Math.max(0, Math.min(viewW - d.start.w, d.start.x + x - d.sx)),
        y: Math.max(0, Math.min(viewH - d.start.h, d.start.y + y - d.sy)),
        w: d.start.w,
        h: d.start.h
      })
    } else if (d.mode === 'resize') {
      const dx = x - d.sx
      const dy = y - d.sy
      let { x: rx, y: ry, w: rw, h: rh } = d.start
      if (d.handle.includes('e')) rw = Math.max(8, d.start.w + dx)
      if (d.handle.includes('s')) rh = Math.max(8, d.start.h + dy)
      if (d.handle.includes('w')) {
        rw = Math.max(8, d.start.w - dx)
        rx = d.start.x + d.start.w - rw
      }
      if (d.handle.includes('n')) {
        rh = Math.max(8, d.start.h - dy)
        ry = d.start.y + d.start.h - rh
      }
      setSelection(clampRect({ x: rx, y: ry, w: rw, h: rh }, viewW, viewH))
    } else if (d.mode === 'draw') {
      let next: Annotation
      if (d.item.kind === 'pen' || d.item.kind === 'highlighter') {
        next = { ...d.item, points: [...d.item.points, [x, y]] }
      } else if ('x2' in d.item) {
        let x2 = x
        let y2 = y
        if (e.shiftKey) {
          if (d.item.kind === 'line' || d.item.kind === 'arrow') {
            // Snap to 45° increments.
            const ang = Math.round(Math.atan2(y - d.item.y1, x - d.item.x1) / (Math.PI / 4)) * (Math.PI / 4)
            const len = Math.hypot(x - d.item.x1, y - d.item.y1)
            x2 = d.item.x1 + Math.cos(ang) * len
            y2 = d.item.y1 + Math.sin(ang) * len
          } else {
            // Square / circle.
            const side = Math.max(Math.abs(x - d.item.x1), Math.abs(y - d.item.y1))
            x2 = d.item.x1 + Math.sign(x - d.item.x1 || 1) * side
            y2 = d.item.y1 + Math.sign(y - d.item.y1 || 1) * side
          }
        }
        next = { ...d.item, x2, y2 }
      } else {
        return
      }
      d.item = next
      setDraft(next)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (d.mode === 'create' && !d.moved && !selection) {
      // A click without dragging (when nothing is selected yet) snips the whole screen.
      selectAll()
    } else if (d.mode === 'draw') {
      setDraft(null)
      const it = d.item
      const tooSmall = 'x2' in it && Math.hypot(it.x2 - it.x1, it.y2 - it.y1) < 3
      if (!tooSmall) pushAnnotation(it)
    } else if (d.mode === 'text') {
      openTextAt(d.x, d.y)
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool === 'select' && inside(e.clientX, e.clientY)) void handleCopy()
  }

  const startResize = (handle: Handle, e: React.PointerEvent) => {
    e.stopPropagation()
    if (!selection) return
    ;(e.currentTarget.parentElement?.parentElement as HTMLElement | null)?.setPointerCapture(e.pointerId)
    dragRef.current = { mode: 'resize', handle, sx: e.clientX, sy: e.clientY, start: selection }
  }

  /* ---- layout of floating UI ---- */

  const TOOLBAR_W = 680
  const TOOLBAR_H = 40
  const OPTIONS_H = 36
  const isDrawingTool = tool !== 'select'
  const blockH = TOOLBAR_H + (isDrawingTool ? OPTIONS_H + 6 : 0)
  let barTop = 0
  let barLeft = 0
  if (selection) {
    barLeft = Math.max(8, Math.min(viewW - TOOLBAR_W - 8, selection.x + selection.w - TOOLBAR_W))
    if (selection.y + selection.h + 10 + blockH < viewH) barTop = selection.y + selection.h + 10
    else if (selection.y - 10 - blockH > 0) barTop = selection.y - 10 - blockH
    else barTop = selection.y + selection.h - blockH - 10
  }

  const showLoupe = !!base && !!cursor && (!selection || (dragRef.current?.mode === 'create' && dragRef.current.moved))
  const selectionCursor = tool === 'select' ? 'move' : tool === 'text' ? 'text' : 'crosshair'

  return (
    <div
      className="relative h-screen w-screen select-none overflow-hidden font-sans"
      style={{ cursor: 'crosshair' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => !selection && setCursor(null)}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {!selection && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-200 shadow-lg">
          Drag to snip · Click for full screen · <Kbd>C</Kbd> copy color · <Kbd>Esc</Kbd> cancel
        </div>
      )}

      {showLoupe && cursor && base && <Loupe base={base} cursor={cursor} imgScale={imgScale} viewW={viewW} viewH={viewH} />}

      {selection && (
        <>
          {/* Selection frame */}
          <div
            className="absolute outline outline-1 outline-indigo-500"
            style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h, cursor: selectionCursor }}
          >
            <div
              className="pointer-events-none absolute left-0 rounded bg-zinc-900/90 px-1.5 py-0.5 font-mono text-[11px] text-white"
              style={{ top: selection.y > 26 ? -24 : 4 }}
            >
              {Math.round(selection.w * imgScale)} × {Math.round(selection.h * imgScale)}
            </div>
            {tool === 'select' &&
              HANDLES.map(({ h, cls, cursor: c }) => (
                <div
                  key={h}
                  onPointerDown={(e) => startResize(h, e)}
                  className={`absolute h-[9px] w-[9px] rounded-full border-2 border-indigo-500 bg-white ${cls}`}
                  style={{ cursor: c }}
                />
              ))}
          </div>

          {/* Text editor — same font metrics as the canvas so what you type is what you get */}
          {editor && (
            <TextEditorBox
              editor={editor}
              onChange={(value) => setEditor((ed) => (ed ? { ...ed, value } : ed))}
              onCommit={commitEditor}
              onCancel={() => setEditor(null)}
            />
          )}

          {/* Toolbars */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute z-20 flex flex-col items-end gap-1.5"
            style={{ left: barLeft, top: barTop, width: TOOLBAR_W, cursor: 'default' }}
          >
            <div className="flex h-10 items-center gap-0.5 rounded-lg border border-white/10 bg-zinc-900/95 px-1 text-zinc-200 shadow-xl">
              {TOOLS.map(({ id, icon: Icon, label, key }) => (
                <ToolButton key={id} active={tool === id} title={`${label} (${key})`} onClick={() => setTool(id)}>
                  <Icon className="h-4 w-4" />
                </ToolButton>
              ))}
              <Divider />
              <ToolButton title="Undo (Ctrl+Z)" disabled={annotations.length === 0} onClick={undo}>
                <Undo2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton title="Redo (Ctrl+Y)" disabled={history.redo.length === 0} onClick={redo}>
                <Redo2 className="h-4 w-4" />
              </ToolButton>
              <Divider />
              <ToolButton title="Select full screen (Ctrl+A)" onClick={selectAll}>
                <Maximize className="h-4 w-4" />
              </ToolButton>
              <ToolButton title="Copy text from image (Ctrl+T)" onClick={() => void handleCopyText()}>
                <ScanText className="h-4 w-4" />
              </ToolButton>
              <ToolButton title="Pin to screen (Ctrl+P)" onClick={() => void handlePin()}>
                <Pin className="h-4 w-4" />
              </ToolButton>
              <ToolButton title="Save as… (Ctrl+S)" onClick={() => void handleSave()}>
                <Save className="h-4 w-4" />
              </ToolButton>
              <ToolButton title="Close (Esc)" onClick={closeOverlay}>
                <X className="h-4 w-4" />
              </ToolButton>
              <button
                type="button"
                title="Copy image (Enter / Ctrl+C / double-click)"
                onClick={() => void handleCopy()}
                className="ml-0.5 flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>

            {isDrawingTool && (
              <div className="flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/95 px-2 text-zinc-300 shadow-xl">
                {tool !== 'pixelate' && (
                  <>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onClick={() => setColor(c)}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          color === c ? 'scale-110 border-white ring-2 ring-indigo-500' : 'border-white/30 hover:scale-110'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                    <label
                      title="Custom color"
                      className="relative ml-0.5 h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-white/30"
                      style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                    >
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                    <Divider />
                  </>
                )}
                {tool === 'pixelate' ? (
                  <span className="px-1 text-xs text-zinc-400">Drag over anything you want to hide</span>
                ) : (
                  ([1, 2, 3] as Size[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      title={`${tool === 'text' ? 'Text size' : 'Thickness'} ${s} (${s})`}
                      onClick={() => setSize(s)}
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${size === s ? 'bg-white/15' : 'hover:bg-white/10'}`}
                    >
                      {tool === 'text' ? (
                        <span className="font-semibold" style={{ fontSize: 9 + s * 3 }}>
                          A
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200" style={{ width: 4 + s * 3, height: 4 + s * 3 }} />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {(busy || notice) && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/95 px-3.5 py-2 text-xs text-zinc-100 shadow-xl">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy ?? notice}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ subcomponents */

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <kbd className="rounded border border-white/20 px-1 font-mono text-[10px]">{children}</kbd>
}

function Divider(): React.JSX.Element {
  return <div className="mx-1 h-5 w-px bg-white/10" />
}

function ToolButton({
  active,
  disabled,
  title,
  onClick,
  children
}: {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${
        active ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function TextEditorBox({
  editor,
  onChange,
  onCommit,
  onCancel
}: {
  editor: TextEditor
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fontSize = FONT[editor.size]
  const lines = editor.value.split('\n')
  const longest = Math.max(4, ...lines.map((l) => l.length))

  useEffect(() => {
    // Focus after mount (and after the click that created it has fully finished).
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }, [])

  return (
    <textarea
      ref={ref}
      value={editor.value}
      spellCheck={false}
      rows={lines.length}
      placeholder="Type…"
      onChange={(e) => onChange(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        } else if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
          // Enter finishes; Shift+Enter adds a new line.
          e.preventDefault()
          onCommit()
        }
      }}
      onBlur={onCommit}
      className="absolute z-30 resize-none overflow-hidden whitespace-pre border-0 bg-transparent p-0 font-semibold outline-none placeholder:text-white/50"
      style={{
        left: editor.x,
        top: editor.y,
        color: editor.color,
        fontSize,
        lineHeight: TEXT_LINE_HEIGHT,
        fontFamily: FONT_FAMILY,
        width: `${longest + 2}ch`,
        caretColor: editor.color,
        outline: '1px dashed rgba(255,255,255,0.7)',
        outlineOffset: 3,
        textShadow: '0 0 1px rgba(0,0,0,0.25)'
      }}
    />
  )
}

/** Magnified view of the pixels around the cursor, with coordinates and color. */
function Loupe({
  base,
  cursor,
  imgScale,
  viewW,
  viewH
}: {
  base: HTMLCanvasElement
  cursor: { x: number; y: number }
  imgScale: number
  viewW: number
  viewH: number
}): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hex, setHex] = useState('#000000')
  const SIZE = 120
  const PIXELS = 15 // source pixels across

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const px = Math.floor(cursor.x * imgScale)
    const py = Math.floor(cursor.y * imgScale)
    const half = Math.floor(PIXELS / 2)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(base, px - half, py - half, PIXELS, PIXELS, 0, 0, canvas.width, canvas.height)
    const cell = canvas.width / PIXELS
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = Math.max(1, dpr)
    ctx.strokeRect(half * cell, half * cell, cell, cell)
    const d = base.getContext('2d')!.getImageData(px, py, 1, 1).data
    setHex(toHex(d[0], d[1], d[2]))
  }, [base, cursor, imgScale])

  const left = cursor.x + 24 + SIZE > viewW ? cursor.x - 24 - SIZE : cursor.x + 24
  const top = cursor.y + 24 + SIZE + 40 > viewH ? cursor.y - 24 - SIZE - 40 : cursor.y + 24

  return (
    <div className="pointer-events-none absolute z-30 overflow-hidden rounded-lg border border-white/15 bg-zinc-900/95 shadow-xl" style={{ left, top, width: SIZE }}>
      <canvas ref={ref} style={{ width: SIZE, height: SIZE, display: 'block' }} />
      <div className="space-y-0.5 px-2 py-1.5 font-mono text-[10px] text-zinc-300">
        <div>
          {Math.round(cursor.x * imgScale)}, {Math.round(cursor.y * imgScale)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-white/30" style={{ background: hex }} />
          {hex.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
