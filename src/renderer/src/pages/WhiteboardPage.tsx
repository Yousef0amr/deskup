import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MousePointer2,
  Hand,
  Pencil,
  Square,
  Circle,
  Diamond,
  ArrowUpRight,
  Minus,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Image as ImageIcon,
  Download,
  Upload,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Box,
  Plus,
  Trash2,
  CopyPlus,
  PaintBucket
} from 'lucide-react'
import type { Bounds, ElementAnimation, LineElement, ShapeElement, StrokeStyle, WbElement, Whiteboard } from '../../../shared/whiteboard'
import {
  STICKY_COLORS,
  WB_COLORS,
  createWhiteboard,
  elementBounds,
  intersects,
  normalizeRect,
  simplifyPoints,
  translateElement,
  unionBounds
} from '../../../shared/whiteboard'
import WbElementView, { FONT, INK } from '../components/whiteboard/WbElementView'
import WbLayersPanel, { type AlignKind } from '../components/whiteboard/WbLayersPanel'
import {
  buildExportCode,
  buildSvgString,
  DEFAULT_EXPORT_CONFIG,
  paddedViewBox,
  type BgShape,
  type ExportCodeFormat,
  type FlipMode,
  type SvgExportConfig
} from '../components/whiteboard/wbExport'
import { parseSvgToElements } from '../components/whiteboard/wbImport'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useToast } from '../components/ui/toast'
import { cn } from '../lib/utils'

type Tool = 'select' | 'hand' | 'pen' | 'rect' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'text' | 'sticky' | 'eraser'
type View = { x: number; y: number; zoom: number }
type Interaction =
  | { kind: 'pan'; sx: number; sy: number; view: View }
  | { kind: 'draw'; el: WbElement; sx: number; sy: number }
  | { kind: 'move'; sx: number; sy: number; before: WbElement[]; moved: boolean }
  | { kind: 'marquee'; sx: number; sy: number; additive: Set<string> }
  | { kind: 'resize'; id: string; handle: string; before: WbElement[] }
  | { kind: 'endpoint'; id: string; end: 1 | 2 | 'c'; before: WbElement[] }
  | { kind: 'erase'; before: WbElement[]; erased: boolean }

const TOOLS: { id: Tool; label: string; key: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Hand (or hold Space)', key: 'H', icon: Hand },
  { id: 'pen', label: 'Pen', key: 'P', icon: Pencil },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: Circle },
  { id: 'diamond', label: 'Diamond', key: 'D', icon: Diamond },
  { id: 'arrow', label: 'Arrow', key: 'A', icon: ArrowUpRight },
  { id: 'line', label: 'Line', key: 'L', icon: Minus },
  { id: 'text', label: 'Text', key: 'T', icon: Type },
  { id: 'sticky', label: 'Sticky note', key: 'S', icon: StickyNote },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser }
]
const TOOL_BY_KEY = Object.fromEntries(TOOLS.map((t) => [t.key.toLowerCase(), t.id]))
const WIDTHS = [2, 4, 7]
const HISTORY_LIMIT = 100
const ACTIVE_KEY = 'deskup.activeWhiteboard'
const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

const newId = () => crypto.randomUUID()
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}
const isBox = (el: WbElement): el is ShapeElement | Extract<WbElement, { type: 'sticky' }> =>
  el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond' || el.type === 'sticky'

export default function WhiteboardPage(): React.JSX.Element {
  const [boards, setBoards] = useState<Whiteboard[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_KEY)
    } catch {
      return null
    }
  })
  const [elements, setElements] = useState<WbElement[]>([])
  const [past, setPast] = useState<WbElement[][]>([])
  const [future, setFuture] = useState<WbElement[][]>([])
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [tool, setTool] = useState<Tool>('select')
  const [color, setColor] = useState(INK)
  const [width, setWidth] = useState(WIDTHS[0])
  const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>('solid')
  const [opacity, setOpacity] = useState(1)
  const [fill, setFill] = useState(false)
  const [fillColor, setFillColor] = useState('')
  const [cornerRadius, setCornerRadius] = useState(8)
  const [depth, setDepth] = useState(0)
  const [fontSize, setFontSize] = useState(20)
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState<WbElement | null>(null)
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [codeFormat, setCodeFormat] = useState<ExportCodeFormat>('svg')
  const [exportConfig, setExportConfig] = useState<SvgExportConfig>(DEFAULT_EXPORT_CONFIG)
  const [copiedCode, setCopiedCode] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importSvgText, setImportSvgText] = useState('')
  const [ioMenuOpen, setIoMenuOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [view3D, setView3D] = useState(false)
  const [tiltX, setTiltX] = useState(24)
  const [tiltY, setTiltY] = useState(-18)

  const svgRef = useRef<SVGSVGElement>(null)
  const contentRef = useRef<SVGGElement>(null)
  const svgFileInputRef = useRef<HTMLInputElement>(null)
  const ioMenuRef = useRef<HTMLDivElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const elementsRef = useRef<WbElement[]>([])
  const viewRef = useRef<View>(view)
  const boardsRef = useRef<Whiteboard[] | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clipboardRef = useRef<WbElement[]>([])
  const toast = useToast()
  elementsRef.current = elements
  viewRef.current = view

  const board = useMemo(() => boards?.find((b) => b.id === activeId) ?? boards?.[0], [boards, activeId])

  // ---------------- persistence
  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = null
    if (boardsRef.current) void window.deskup.whiteboards.save(boardsRef.current).catch((err) => toast('Whiteboard not saved: ' + (err as Error).message, 'error'))
  }, [toast])

  const persistBoards = useCallback(
    (next: Whiteboard[]) => {
      boardsRef.current = next
      setBoards(next)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(flush, 500)
    },
    [flush]
  )

  useEffect(() => {
    window.deskup.whiteboards
      .list()
      .then((list) => {
        const ready = list.length ? list : [createWhiteboard(newId(), 'My whiteboard')]
        boardsRef.current = ready
        setBoards(ready)
        if (!list.length) window.deskup.whiteboards.save(ready).catch((err) => toast('Whiteboard not saved: ' + (err as Error).message, 'error'))
      })
      .catch((err) => toast('Could not load whiteboards: ' + (err as Error).message, 'error'))
    return () => flush()
  }, [flush, toast])

  // Switching boards: load its elements, reset history and view.
  useEffect(() => {
    if (!board) return
    setElements(board.elements)
    setPast([])
    setFuture([])
    setSelected(new Set())
    setEditingId(null)
    const rect = svgRef.current?.getBoundingClientRect()
    const b = unionBounds(board.elements.map(elementBounds))
    if (b && rect) {
      const zoom = clampZoom(Math.min(1, Math.min((rect.width - 160) / Math.max(b.w, 1), (rect.height - 160) / Math.max(b.h, 1))))
      setView({ zoom, x: rect.width / 2 - (b.x + b.w / 2) * zoom, y: rect.height / 2 - (b.y + b.h / 2) * zoom })
    } else setView({ x: (rect?.width ?? 800) / 2, y: (rect?.height ?? 600) / 2, zoom: 1 })
    try {
      localStorage.setItem(ACTIVE_KEY, board.id)
    } catch {
      // Convenience only.
    }
  }, [board?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Replace elements; `before` (if given) is pushed to history so the change can be undone. */
  const commit = useCallback(
    (next: WbElement[], before: WbElement[] | null = elementsRef.current) => {
      if (before) {
        setPast((p) => [...p, before].slice(-HISTORY_LIMIT))
        setFuture([])
      }
      elementsRef.current = next
      setElements(next)
      const id = board?.id
      if (id && boardsRef.current) persistBoards(boardsRef.current.map((b) => (b.id === id ? { ...b, elements: next, updatedAt: Date.now() } : b)))
    },
    [board?.id, persistBoards]
  )

  // Side effects stay out of state updaters (StrictMode runs updaters twice in dev).
  const undo = () => {
    if (!past.length) return
    const prev = past[past.length - 1]
    setPast(past.slice(0, -1))
    setFuture([elementsRef.current, ...future].slice(0, HISTORY_LIMIT))
    setSelected(new Set())
    commit(prev, null)
  }

  const redo = () => {
    if (!future.length) return
    setPast([...past, elementsRef.current].slice(-HISTORY_LIMIT))
    setFuture(future.slice(1))
    commit(future[0], null)
  }

  // ---------------- coordinates
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current!.getBoundingClientRect()
      return { x: (clientX - rect.left - view.x) / view.zoom, y: (clientY - rect.top - view.y) / view.zoom }
    },
    [view]
  )

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = (clientX ?? rect.left + rect.width / 2) - rect.left
    const cy = (clientY ?? rect.top + rect.height / 2) - rect.top
    setView((v) => {
      const zoom = clampZoom(v.zoom * factor)
      return { zoom, x: cx - ((cx - v.x) / v.zoom) * zoom, y: cy - ((cy - v.y) / v.zoom) * zoom }
    })
  }, [])

  const fitToContent = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    const b = unionBounds(elementsRef.current.map(elementBounds))
    if (!rect) return
    if (!b) return setView({ x: rect.width / 2, y: rect.height / 2, zoom: 1 })
    const zoom = clampZoom(Math.min(2, Math.min((rect.width - 120) / Math.max(b.w, 1), (rect.height - 120) / Math.max(b.h, 1))))
    setView({ zoom, x: rect.width / 2 - (b.x + b.w / 2) * zoom, y: rect.height / 2 - (b.y + b.h / 2) * zoom })
  }, [])

  // Wheel: pan, or zoom with Ctrl/⌘ (also trackpad pinch). Non-passive so we can preventDefault.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [zoomAt, boards])

  // ---------------- element helpers
  const elementAt = (clientX: number, clientY: number): string | null => {
    for (const node of document.elementsFromPoint(clientX, clientY)) {
      const id = (node as Element).closest?.('[data-id]')?.getAttribute('data-id')
      if (id && contentRef.current?.contains(node)) {
        const el = elementsRef.current.find((x) => x.id === id)
        if (el && !el.hidden && !el.locked) return id
      }
    }
    return null
  }

  const deleteSelected = useCallback(() => {
    if (!selected.size) return
    commit(elementsRef.current.filter((el) => !selected.has(el.id)))
    setSelected(new Set())
  }, [selected, commit])

  const duplicateSelected = useCallback(
    (source: WbElement[] = elementsRef.current.filter((el) => selected.has(el.id)), offset = 24) => {
      if (!source.length) return
      const copies = source.map((el) => ({ ...translateElement(el, offset, offset), id: newId() }))
      commit([...elementsRef.current, ...copies])
      setSelected(new Set(copies.map((c) => c.id)))
    },
    [selected, commit]
  )

  const updateSelected = (patch: (el: WbElement) => WbElement) => {
    if (!selected.size) return
    commit(elementsRef.current.map((el) => (selected.has(el.id) ? patch(el) : el)))
  }

  const bringToFront = () => {
    if (!selected.size) return
    const rest = elementsRef.current.filter((el) => !selected.has(el.id))
    const sel = elementsRef.current.filter((el) => selected.has(el.id))
    commit([...rest, ...sel])
  }

  const sendToBack = () => {
    if (!selected.size) return
    const sel = elementsRef.current.filter((el) => selected.has(el.id))
    const rest = elementsRef.current.filter((el) => !selected.has(el.id))
    commit([...sel, ...rest])
  }

  const groupSelected = useCallback(() => {
    if (selected.size < 2) return
    const gid = newId()
    commit(elementsRef.current.map((el) => (selected.has(el.id) ? { ...el, groupId: gid } : el)))
    toast('Grouped elements')
  }, [commit, selected, toast])

  const ungroupSelected = useCallback(() => {
    if (!selected.size) return
    commit(
      elementsRef.current.map((el) => {
        if (!selected.has(el.id) || !el.groupId) return el
        const { groupId: _g, ...rest } = el
        return rest
      })
    )
    toast('Ungrouped elements')
  }, [commit, selected, toast])

  const toggleHidden = (id: string) => {
    commit(elementsRef.current.map((el) => (el.id === id ? { ...el, hidden: !el.hidden } : el)))
  }

  const toggleLocked = (id: string) => {
    commit(elementsRef.current.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el)))
  }

  const moveLayer = (id: string, dir: 'up' | 'down') => {
    const list = [...elementsRef.current]
    const idx = list.findIndex((el) => el.id === id)
    if (idx === -1) return
    const target = dir === 'up' ? idx + 1 : idx - 1
    if (target < 0 || target >= list.length) return
    ;[list[idx], list[target]] = [list[target], list[idx]]
    commit(list)
  }

  const alignSelected = (kind: AlignKind) => {
    const sel = elementsRef.current.filter((el) => selected.has(el.id) && !el.locked)
    if (sel.length < 2) return
    const entries = sel.map((el) => ({ el, b: elementBounds(el) }))
    const total = unionBounds(entries.map((e) => e.b))
    if (!total) return

    const shifts = new Map<string, [number, number]>()
    if (kind === 'distH' && entries.length >= 3) {
      const sorted = [...entries].sort((a, b) => a.b.x - b.b.x)
      const totalW = sorted.reduce((acc, e) => acc + e.b.w, 0)
      const gap = (total.w - totalW) / (sorted.length - 1)
      let cursor = total.x
      for (const e of sorted) {
        shifts.set(e.el.id, [cursor - e.b.x, 0])
        cursor += e.b.w + gap
      }
    } else if (kind === 'distV' && entries.length >= 3) {
      const sorted = [...entries].sort((a, b) => a.b.y - b.b.y)
      const totalH = sorted.reduce((acc, e) => acc + e.b.h, 0)
      const gap = (total.h - totalH) / (sorted.length - 1)
      let cursor = total.y
      for (const e of sorted) {
        shifts.set(e.el.id, [0, cursor - e.b.y])
        cursor += e.b.h + gap
      }
    } else {
      for (const { el, b } of entries) {
        if (kind === 'left') shifts.set(el.id, [total.x - b.x, 0])
        else if (kind === 'centerH') shifts.set(el.id, [total.x + total.w / 2 - (b.x + b.w / 2), 0])
        else if (kind === 'right') shifts.set(el.id, [total.x + total.w - (b.x + b.w), 0])
        else if (kind === 'top') shifts.set(el.id, [0, total.y - b.y])
        else if (kind === 'centerV') shifts.set(el.id, [0, total.y + total.h / 2 - (b.y + b.h / 2)])
        else if (kind === 'bottom') shifts.set(el.id, [0, total.y + total.h - (b.y + b.h)])
      }
    }

    commit(
      elementsRef.current.map((el) => {
        const s = shifts.get(el.id)
        return s && (s[0] !== 0 || s[1] !== 0) ? translateElement(el, s[0], s[1]) : el
      })
    )
  }

  // ---------------- pointer handling
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (editingId) return
    const svg = svgRef.current!
    const p = toWorld(e.clientX, e.clientY)

    if (e.button === 1 || tool === 'hand' || spaceDown) {
      interaction.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, view }
      svg.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0) return

    const handle = (e.target as Element).closest('[data-handle]')?.getAttribute('data-handle')
    if (handle && selected.size === 1) {
      const id = [...selected][0]
      interaction.current =
        handle === 'p1' || handle === 'p2' || handle === 'curve'
          ? { kind: 'endpoint', id, end: handle === 'curve' ? 'c' : handle === 'p1' ? 1 : 2, before: elementsRef.current }
          : { kind: 'resize', id, handle, before: elementsRef.current }
      svg.setPointerCapture(e.pointerId)
      return
    }

    const base = { id: newId(), color, ...(opacity < 1 ? { opacity } : {}) }
    switch (tool) {
      case 'select': {
        const hit = elementAt(e.clientX, e.clientY)
        if (hit) {
          const hitEl = elementsRef.current.find((x) => x.id === hit)
          const hitIds = !e.altKey && hitEl?.groupId
            ? elementsRef.current.filter((x) => x.groupId === hitEl.groupId).map((x) => x.id)
            : [hit]
          let next = selected
          if (e.shiftKey) {
            next = new Set(selected)
            const allIn = hitIds.every((id) => next.has(id))
            for (const id of hitIds) {
              if (allIn) next.delete(id)
              else next.add(id)
            }
          } else if (!selected.has(hit)) {
            next = new Set(hitIds)
          }
          setSelected(next)
          interaction.current = { kind: 'move', sx: p.x, sy: p.y, before: elementsRef.current, moved: false }
        } else {
          if (!e.shiftKey) setSelected(new Set())
          interaction.current = { kind: 'marquee', sx: p.x, sy: p.y, additive: e.shiftKey ? new Set(selected) : new Set() }
        }
        break
      }
      case 'eraser': {
        const hit = elementAt(e.clientX, e.clientY)
        const before = elementsRef.current
        if (hit) commit(before.filter((el) => el.id !== hit), null)
        interaction.current = { kind: 'erase', before, erased: !!hit }
        break
      }
      case 'pen':
        interaction.current = {
          kind: 'draw',
          sx: p.x,
          sy: p.y,
          el: { ...base, type: 'path', points: [[p.x, p.y]], width, ...(strokeStyle !== 'solid' ? { strokeStyle } : {}) }
        }
        break
      case 'rect':
      case 'ellipse':
      case 'diamond':
        interaction.current = {
          kind: 'draw',
          sx: p.x,
          sy: p.y,
          el: {
            ...base,
            type: tool,
            x: p.x,
            y: p.y,
            w: 0,
            h: 0,
            width,
            fill,
            ...(fillColor ? { fillColor } : {}),
            ...(strokeStyle !== 'solid' ? { strokeStyle } : {}),
            ...(tool === 'rect' && cornerRadius !== 8 ? { rx: cornerRadius } : {}),
            ...(depth > 0 ? { depth } : {})
          }
        }
        break
      case 'arrow':
      case 'line':
        interaction.current = {
          kind: 'draw',
          sx: p.x,
          sy: p.y,
          el: { ...base, type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, width, ...(strokeStyle !== 'solid' ? { strokeStyle } : {}) }
        }
        break
      case 'text': {
        e.preventDefault() // keep the browser from moving focus away from the new editor
        const el: WbElement = { ...base, type: 'text', x: p.x, y: p.y - 12, text: '', size: fontSize }
        commit([...elementsRef.current, el])
        setSelected(new Set([el.id]))
        setEditingId(el.id)
        return
      }
      case 'sticky': {
        e.preventDefault()
        const el: WbElement = { id: base.id, color: stickyColor, ...(opacity < 1 ? { opacity } : {}), type: 'sticky', x: p.x - 90, y: p.y - 70, w: 180, h: 140, text: '' }
        commit([...elementsRef.current, el])
        setSelected(new Set([el.id]))
        setEditingId(el.id)
        setTool('select')
        return
      }
    }
    if (interaction.current?.kind === 'draw') setDraft(interaction.current.el)
    svg.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const it = interaction.current
    if (!it) return
    const p = toWorld(e.clientX, e.clientY)
    switch (it.kind) {
      case 'pan':
        setView({ ...it.view, x: it.view.x + e.clientX - it.sx, y: it.view.y + e.clientY - it.sy })
        break
      case 'draw': {
        const el = it.el
        let next: WbElement
        if (el.type === 'path') next = { ...el, points: [...el.points, [p.x, p.y]] }
        else if (el.type === 'arrow' || el.type === 'line') {
          let { x, y } = p
          if (e.shiftKey) {
            // Snap to 45° increments.
            const angle = Math.round(Math.atan2(y - it.sy, x - it.sx) / (Math.PI / 4)) * (Math.PI / 4)
            const len = Math.hypot(x - it.sx, y - it.sy)
            x = it.sx + Math.cos(angle) * len
            y = it.sy + Math.sin(angle) * len
          }
          next = { ...el, x2: x, y2: y }
        } else {
          let r = normalizeRect(it.sx, it.sy, p.x, p.y)
          if (e.shiftKey) {
            const s = Math.max(r.w, r.h)
            r = normalizeRect(it.sx, it.sy, it.sx + Math.sign(p.x - it.sx || 1) * s, it.sy + Math.sign(p.y - it.sy || 1) * s)
          }
          next = { ...(el as ShapeElement), ...r }
        }
        it.el = next
        setDraft(next)
        break
      }
      case 'move': {
        let dx = p.x - it.sx
        let dy = p.y - it.sy
        if (!it.moved && Math.hypot(dx, dy) * view.zoom < 3) return
        it.moved = true
        if (snapToGrid) {
          dx = Math.round(dx / 24) * 24
          dy = Math.round(dy / 24) * 24
        }
        setElements(it.before.map((el) => (selected.has(el.id) && !el.locked ? translateElement(el, dx, dy) : el)))
        break
      }
      case 'marquee': {
        const r = normalizeRect(it.sx, it.sy, p.x, p.y)
        setMarquee(r)
        const hits = elementsRef.current.filter((el) => intersects(r, elementBounds(el))).map((el) => el.id)
        setSelected(new Set([...it.additive, ...hits]))
        break
      }
      case 'resize': {
        setElements(
          it.before.map((el) => {
            if (el.id !== it.id) return el
            if (it.handle === 'rotate') {
              const b = elementBounds(el)
              const cx = b.x + b.w / 2
              const cy = b.y + b.h / 2
              let deg = Math.round((Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90)
              deg = ((deg % 360) + 360) % 360
              if (e.shiftKey) deg = Math.round(deg / 15) * 15
              return { ...el, rotation: deg }
            }
            if (it.handle.startsWith('rx-') && el.type === 'rect') {
              const idx = Number(it.handle.slice(3))
              const maxRx = Math.min(el.w, el.h) / 2
              const dist =
                idx === 0
                  ? Math.max(p.x - el.x, p.y - el.y)
                  : idx === 1
                    ? Math.max(el.x + el.w - p.x, p.y - el.y)
                    : idx === 2
                      ? Math.max(el.x + el.w - p.x, el.y + el.h - p.y)
                      : Math.max(p.x - el.x, el.y + el.h - p.y)
              const nextVal = Math.round(Math.max(0, Math.min(maxRx, dist)))
              if (e.shiftKey) {
                return { ...el, rx: nextVal, corners: [nextVal, nextVal, nextVal, nextVal] }
              }
              const base = el.rx ?? 8
              const prev: [number, number, number, number] = el.corners ? [...el.corners] : [base, base, base, base]
              prev[idx] = nextVal
              return { ...el, corners: prev }
            }
            if (isBox(el)) {
              const minW = el.type === 'sticky' ? 60 : 8
              const minH = el.type === 'sticky' ? 50 : 8
              let { x, y, w, h } = el
              const hnd = it.handle === 'resize' ? 'se' : it.handle
              if (hnd.includes('e')) w = Math.max(minW, p.x - el.x)
              if (hnd.includes('s')) h = Math.max(minH, p.y - el.y)
              if (hnd.includes('w')) {
                const nw = Math.max(minW, el.x + el.w - p.x)
                x = el.x + el.w - nw
                w = nw
              }
              if (hnd.includes('n')) {
                const nh = Math.max(minH, el.y + el.h - p.y)
                y = el.y + el.h - nh
                h = nh
              }
              return { ...el, x, y, w, h }
            }
            if (el.type === 'text') return { ...el, size: Math.round(Math.min(160, Math.max(8, (p.y - el.y) / Math.max(1, el.text.split('\n').length) / 1.3))) }
            return el
          })
        )
        break
      }
      case 'endpoint':
        setElements(
          it.before.map((el) => {
            if (el.id !== it.id || (el.type !== 'arrow' && el.type !== 'line')) return el
            if (it.end === 'c') {
              return { ...el, cx: 2 * p.x - (el.x1 + el.x2) / 2, cy: 2 * p.y - (el.y1 + el.y2) / 2 }
            }
            return it.end === 1 ? { ...el, x1: p.x, y1: p.y } : { ...el, x2: p.x, y2: p.y }
          })
        )
        break
      case 'erase': {
        const hit = elementAt(e.clientX, e.clientY)
        if (hit) {
          it.erased = true
          const next = elementsRef.current.filter((el) => el.id !== hit)
          elementsRef.current = next
          setElements(next)
        }
        break
      }
    }
  }

  const onPointerUp = () => {
    const it = interaction.current
    interaction.current = null
    if (!it) return
    switch (it.kind) {
      case 'draw': {
        setDraft(null)
        let el = it.el
        if (el.type === 'path') {
          el = { ...el, points: simplifyPoints(el.points) }
        } else if (el.type === 'arrow' || el.type === 'line') {
          if (Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 4) el = { ...el, x2: el.x1 + 120, y2: el.y1 }
        } else if ((el as ShapeElement).w < 4 && (el as ShapeElement).h < 4) {
          // A click (no drag) drops a default-sized shape.
          el = { ...(el as ShapeElement), x: it.sx - 70, y: it.sy - 45, w: 140, h: 90 }
        }
        commit([...elementsRef.current, el])
        if (el.type !== 'path') {
          setSelected(new Set([el.id]))
          setTool('select')
        }
        break
      }
      case 'move':
        if (it.moved) commit(elementsRef.current, it.before)
        break
      case 'resize':
      case 'endpoint':
        commit(elementsRef.current, it.before)
        break
      case 'erase':
        if (it.erased) commit(elementsRef.current, it.before)
        break
      case 'marquee':
        setMarquee(null)
        break
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const hit = elementAt(e.clientX, e.clientY)
    const el = elementsRef.current.find((x) => x.id === hit)
    if (el && (el.type === 'text' || el.type === 'sticky' || el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond')) {
      setSelected(new Set([el.id]))
      setEditingId(el.id)
    } else if (!hit && tool === 'select') {
      // Double-click on empty canvas = quick text.
      const p = toWorld(e.clientX, e.clientY)
      const text: WbElement = { id: newId(), color, type: 'text', x: p.x, y: p.y - 12, text: '', size: 20 }
      commit([...elementsRef.current, text])
      setSelected(new Set([text.id]))
      setEditingId(text.id)
    }
  }

  // ---------------- text editing overlay
  const editing = elements.find((el) => el.id === editingId)
  const finishEditing = (value: string) => {
    if (!editing) return setEditingId(null)
    const trimmed = value.replace(/\s+$/, '')
    let next: WbElement[]
    if (editing.type === 'text' && !trimmed) next = elementsRef.current.filter((el) => el.id !== editing.id)
    else next = elementsRef.current.map((el) => (el.id === editing.id ? ({ ...el, text: trimmed } as WbElement) : el))
    commit(next)
    setEditingId(null)
    setTool('select')
  }

  // ---------------- keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || editingId) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (e.code === 'Space') {
        e.preventDefault()
        setSpaceDown(true)
        return
      }
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        redo()
      } else if (mod && key === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (mod && key === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelected()
        else groupSelected()
      } else if (mod && key === 'a') {
        e.preventDefault()
        setSelected(new Set(elementsRef.current.map((el) => el.id)))
        setTool('select')
      } else if (mod && key === 'c' && selected.size) {
        clipboardRef.current = elementsRef.current.filter((el) => selected.has(el.id))
      } else if (mod && key === 'v' && clipboardRef.current.length) {
        e.preventDefault()
        duplicateSelected(clipboardRef.current, 32)
      } else if (mod && (key === '=' || key === '+')) {
        e.preventDefault()
        zoomAt(1.2)
      } else if (mod && key === '-') {
        e.preventDefault()
        zoomAt(1 / 1.2)
      } else if (mod && key === '0') {
        e.preventDefault()
        fitToContent()
      } else if (key === 'delete' || key === 'backspace') {
        deleteSelected()
      } else if (key === 'escape') {
        setSelected(new Set())
        setTool('select')
      } else if (key === 'enter' && selected.size === 1) {
        const el = elementsRef.current.find((x) => selected.has(x.id))
        if (el && el.type !== 'path' && el.type !== 'arrow' && el.type !== 'line') {
          e.preventDefault()
          setEditingId(el.id)
        }
      } else if (key.startsWith('arrow') && selected.size) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        updateSelected((el) => translateElement(el, dx, dy))
      } else if (!mod && !e.altKey && TOOL_BY_KEY[key]) {
        setTool(TOOL_BY_KEY[key] as Tool)
        if (TOOL_BY_KEY[key] !== 'select') setSelected(new Set())
      }
    }
    const onKeyUp = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }) // re-bound each render so handlers see fresh state

  // ---------------- export
  const getExportContext = () => {
    const content = contentRef.current
    const b = unionBounds(elementsRef.current.map(elementBounds))
    if (!content || !b) {
      toast('Nothing to export yet', 'info')
      return null
    }
    return { content, bounds: b }
  }

  const downloadBlob = (content: string, mime: string, ext: string) => {
    if (!board) return
    const slug = board.name.replace(/[^\w\- ]+/g, '').trim() || 'whiteboard'
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderPng = async (): Promise<string | null> => {
    const ctxData = getExportContext()
    if (!ctxData) return null
    const vb = paddedViewBox(ctxData.bounds)
    const svg = buildSvgString(ctxData.content.innerHTML, ctxData.bounds, { includeBg: true })
    const img = new Image()
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    await img.decode()
    const scale = Math.min(2, 8000 / Math.max(vb.w, vb.h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(vb.w * scale)
    canvas.height = Math.ceil(vb.h * scale)
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, vb.w, vb.h)
    return canvas.toDataURL('image/png')
  }

  const copyImage = async () => {
    const url = await renderPng()
    if (!url) return
    await window.deskup.clipboard.copyImageData(url)
    toast('Whiteboard copied as an image')
  }

  const exportPng = async () => {
    const url = await renderPng()
    if (!url || !board) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${board.name.replace(/[^\w\- ]+/g, '').trim() || 'whiteboard'}.png`
    a.click()
  }

  const exportSvg = () => {
    const ctxData = getExportContext()
    if (!ctxData) return
    const svg = buildSvgString(ctxData.content.innerHTML, ctxData.bounds, { pretty: true, config: exportConfig })
    downloadBlob(svg, 'image/svg+xml;charset=utf-8', 'svg')
  }

  const openCodeModal = () => {
    if (!getExportContext()) return
    setCopiedCode(false)
    setCodeModalOpen(true)
  }

  const exportCodeText = useMemo(() => {
    if (!codeModalOpen) return ''
    const content = contentRef.current
    const b = unionBounds(elements.map(elementBounds))
    if (!content || !b) return ''
    return buildExportCode(codeFormat, content.innerHTML, b, elements, exportConfig)
  }, [codeModalOpen, codeFormat, elements, exportConfig])

  const exportPreviewUrl = useMemo(() => {
    if (!codeModalOpen) return ''
    const content = contentRef.current
    const b = unionBounds(elements.map(elementBounds))
    if (!content || !b) return ''
    const svg = buildSvgString(content.innerHTML, b, { config: exportConfig })
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  }, [codeModalOpen, elements, exportConfig])

  const copyExportCode = async () => {
    if (!exportCodeText) return
    await navigator.clipboard.writeText(exportCodeText)
    setCopiedCode(true)
    toast(`Copied ${codeFormat.toUpperCase()} to clipboard`)
    setTimeout(() => setCopiedCode(false), 1800)
  }

  const downloadExportCode = () => {
    if (!exportCodeText) return
    const ext = codeFormat === 'jsx' ? 'tsx' : codeFormat
    const mime = codeFormat === 'svg' ? 'image/svg+xml;charset=utf-8' : 'text/plain;charset=utf-8'
    downloadBlob(exportCodeText, mime, ext)
  }

  // ---------------- svg import
  const insertSvgToBoard = useCallback(
    (svgText: string): boolean => {
      try {
        const parsed = parseSvgToElements(svgText, newId)
        const b = unionBounds(parsed.map(elementBounds))
        const rect = svgRef.current?.getBoundingClientRect()
        const v = viewRef.current
        const centerX = rect ? (rect.width / 2 - v.x) / v.zoom : 0
        const centerY = rect ? (rect.height / 2 - v.y) / v.zoom : 0
        const dx = b ? centerX - (b.x + b.w / 2) : 0
        const dy = b ? centerY - (b.y + b.h / 2) : 0
        const placed = parsed.map((el) => translateElement(el, dx, dy))
        commit([...elementsRef.current, ...placed])
        setSelected(new Set(placed.map((el) => el.id)))
        setTool('select')
        toast(`Imported ${placed.length} element${placed.length === 1 ? '' : 's'} from SVG`)
        return true
      } catch (err) {
        toast((err as Error).message || 'Could not import SVG', 'error')
        return false
      }
    },
    [commit, toast]
  )

  const handleImportSvgFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file
      .text()
      .then((text) => {
        setImportSvgText(text)
        if (insertSvgToBoard(text)) setImportModalOpen(false)
      })
      .catch(() => toast('Could not read SVG file', 'error'))
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || importModalOpen) return
      const text = e.clipboardData?.getData('text/plain')
      if (!text || !text.includes('<svg')) return
      e.preventDefault()
      insertSvgToBoard(text)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [importModalOpen, insertSvgToBoard])

  useEffect(() => {
    if (!ioMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (ioMenuRef.current && !ioMenuRef.current.contains(e.target as Node)) setIoMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIoMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [ioMenuOpen])

  // ---------------- board management
  const addBoard = () => {
    if (!boardsRef.current) return
    const created = createWhiteboard(newId(), `Whiteboard ${boardsRef.current.length + 1}`)
    persistBoards([...boardsRef.current, created])
    setActiveId(created.id)
  }

  const deleteBoard = () => {
    if (!board || !boardsRef.current || boardsRef.current.length <= 1) return
    if (!confirm(`Delete “${board.name}”? This cannot be undone.`)) return
    persistBoards(boardsRef.current.filter((b) => b.id !== board.id))
    setActiveId(null)
  }

  if (!boards || !board) return <div className="py-12 text-center text-sm text-muted">Loading whiteboard…</div>

  // ---------------- selection overlay
  const selectedEls = elements.filter((el) => selected.has(el.id))
  const selBounds = unionBounds(selectedEls.map(elementBounds))
  const single = selectedEls.length === 1 ? selectedEls[0] : null
  const hs = 8 / view.zoom
  const showStyle = tool !== 'select' && tool !== 'hand' && tool !== 'eraser' ? true : selectedEls.length > 0
  const activeColor = single && single.type !== 'sticky' ? single.color : color
  const cursor = spaceDown || tool === 'hand' ? (interaction.current?.kind === 'pan' ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair'

  const editorStyle = (() => {
    if (!editing) return null
    const b = elementBounds(editing)
    const left = view.x + b.x * view.zoom
    const top = view.y + b.y * view.zoom
    if (editing.type === 'text') {
      return { left, top, width: Math.max(220, b.w * view.zoom + 40), height: Math.max(40, b.h * view.zoom + 20), fontSize: editing.size * view.zoom, color: 'rgb(var(--text))', textAlign: 'left' as const, background: 'transparent' }
    }
    return { left, top, width: b.w * view.zoom, height: b.h * view.zoom, fontSize: (editing.type === 'sticky' ? 14 : 16) * view.zoom, color: editing.type === 'sticky' ? INK : 'rgb(var(--text))', textAlign: editing.type === 'sticky' ? ('left' as const) : ('center' as const), background: editing.type === 'sticky' ? editing.color : 'rgb(var(--surface) / 0.9)' }
  })()

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-3">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-2">
        <select
          value={board.id}
          onChange={(e) => setActiveId(e.target.value)}
          className="h-8 max-w-[200px] cursor-pointer rounded-lg bg-transparent text-xl font-semibold tracking-tight text-text hover:bg-elevated focus:outline-none"
          aria-label="Whiteboard"
        >
          {boards.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          key={board.id}
          defaultValue={board.name}
          onBlur={(e) => {
            const name = e.target.value.trim().slice(0, 80) || 'Untitled whiteboard'
            if (name !== board.name) persistBoards(boards.map((b) => (b.id === board.id ? { ...b, name } : b)))
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-7 w-40 rounded-md border border-transparent bg-transparent px-2 text-xs text-muted hover:border-border focus:border-indigo-500/60 focus:text-text focus:outline-none"
          aria-label="Rename whiteboard"
          title="Rename"
        />
        <button type="button" onClick={addBoard} className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-text" title="New whiteboard" aria-label="New whiteboard">
          <Plus className="h-4 w-4" />
        </button>
        {boards.length > 1 && (
          <button type="button" onClick={deleteBoard} className="rounded-md p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-500" title="Delete whiteboard" aria-label="Delete whiteboard">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <div ref={ioMenuRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setIoMenuOpen((o) => !o)}
            aria-expanded={ioMenuOpen}
            aria-haspopup="menu"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-text hover:bg-elevated"
          >
            <Download className="h-3.5 w-3.5" />
            Import / Export
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform', ioMenuOpen && 'rotate-180')} />
          </button>
          {ioMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-fade-in"
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Import</div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIoMenuOpen(false)
                  setImportSvgText('')
                  setImportModalOpen(true)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-elevated"
              >
                <Upload className="h-3.5 w-3.5 text-muted" /> Import SVG…
              </button>
              <div className="my-1 border-t border-border" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Export</div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIoMenuOpen(false)
                  void copyImage()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-elevated"
              >
                <ImageIcon className="h-3.5 w-3.5 text-muted" /> Copy image
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIoMenuOpen(false)
                  void exportPng()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-elevated"
              >
                <Download className="h-3.5 w-3.5 text-muted" /> Download PNG
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIoMenuOpen(false)
                  exportSvg()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-elevated"
              >
                <Download className="h-3.5 w-3.5 text-muted" /> Download SVG
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIoMenuOpen(false)
                  openCodeModal()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text hover:bg-elevated"
              >
                <Code2 className="h-3.5 w-3.5 text-muted" /> Export SVG / Code…
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface">
        {/* Dot grid follows pan/zoom */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgb(var(--border)) 1px, transparent 1px)',
            backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
            backgroundPosition: `${view.x}px ${view.y}px`
          }}
        />
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full touch-none select-none transition-transform duration-200"
          style={{
            cursor,
            ...(view3D
              ? {
                  transform: `perspective(1100px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(0.92)`,
                  transformStyle: 'preserve-3d' as const
                }
              : {})
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            <g ref={contentRef}>
              {elements.map((el) => (
                <WbElementView key={el.id} el={el} hideText={el.id === editingId} />
              ))}
              {draft && <WbElementView el={draft} />}
            </g>

            {/* Selection */}
            {selBounds && !editingId && (
              <g pointerEvents="none">
                <rect x={selBounds.x - 4 / view.zoom} y={selBounds.y - 4 / view.zoom} width={selBounds.w + 8 / view.zoom} height={selBounds.h + 8 / view.zoom} fill="none" stroke="#4a6bec" strokeWidth={1 / view.zoom} strokeDasharray={`${4 / view.zoom} ${3 / view.zoom}`} />
              </g>
            )}
            {single && selBounds && !editingId && (() => {
              const rx = selBounds.x + selBounds.w / 2
              const ryTop = selBounds.y - 4 / view.zoom
              const ryHandle = ryTop - 22 / view.zoom
              return (
                <g>
                  <line x1={rx} y1={ryTop} x2={rx} y2={ryHandle} stroke="#4a6bec" strokeWidth={1 / view.zoom} pointerEvents="none" />
                  <circle
                    data-handle="rotate"
                    cx={rx}
                    cy={ryHandle}
                    r={hs / 1.7}
                    fill="#fff"
                    stroke="#4a6bec"
                    strokeWidth={1.5 / view.zoom}
                    style={{ cursor: 'grab' }}
                  >
                    <title>Drag to rotate (Shift = 15° steps)</title>
                  </circle>
                </g>
              )
            })()}
            {single && !editingId && isBox(single) && (() => {
              const bx = selBounds!.x - 4 / view.zoom
              const by = selBounds!.y - 4 / view.zoom
              const bw = selBounds!.w + 8 / view.zoom
              const bh = selBounds!.h + 8 / view.zoom
              const boxHandles: [string, number, number, string][] = [
                ['nw', bx, by, 'nwse-resize'],
                ['n', bx + bw / 2, by, 'ns-resize'],
                ['ne', bx + bw, by, 'nesw-resize'],
                ['e', bx + bw, by + bh / 2, 'ew-resize'],
                ['se', bx + bw, by + bh, 'nwse-resize'],
                ['s', bx + bw / 2, by + bh, 'ns-resize'],
                ['sw', bx, by + bh, 'nesw-resize'],
                ['w', bx, by + bh / 2, 'ew-resize']
              ]
              return (
                <>
                  {boxHandles.map(([h, hx, hy, cur]) => (
                    <rect key={h} data-handle={h} x={hx - hs / 2} y={hy - hs / 2} width={hs} height={hs} rx={2 / view.zoom} fill="#fff" stroke="#4a6bec" strokeWidth={1.5 / view.zoom} style={{ cursor: cur }} />
                  ))}
                  {single.type === 'rect' && single.w > 24 && single.h > 24 && (() => {
                    const base = single.rx ?? 8
                    const corners = single.corners ?? [base, base, base, base]
                    const maxRx = Math.min(single.w, single.h) / 2
                    const minIn = 10 / view.zoom
                    const pts: [number, number, number][] = [
                      [0, single.x + Math.max(minIn, Math.min(maxRx, corners[0])), single.y + Math.max(minIn, Math.min(maxRx, corners[0]))],
                      [1, single.x + single.w - Math.max(minIn, Math.min(maxRx, corners[1])), single.y + Math.max(minIn, Math.min(maxRx, corners[1]))],
                      [2, single.x + single.w - Math.max(minIn, Math.min(maxRx, corners[2])), single.y + single.h - Math.max(minIn, Math.min(maxRx, corners[2]))],
                      [3, single.x + Math.max(minIn, Math.min(maxRx, corners[3])), single.y + single.h - Math.max(minIn, Math.min(maxRx, corners[3]))]
                    ]
                    return pts.map(([idx, cx, cy]) => (
                      <circle
                        key={`rx-${idx}`}
                        data-handle={`rx-${idx}`}
                        cx={cx}
                        cy={cy}
                        r={hs / 2}
                        fill="#fff"
                        stroke="#4a6bec"
                        strokeWidth={1.5 / view.zoom}
                        style={{ cursor: idx === 0 || idx === 2 ? 'nwse-resize' : 'nesw-resize' }}
                      >
                        <title>Drag to curve this corner (Shift = all corners)</title>
                      </circle>
                    ))
                  })()}
                </>
              )
            })()}
            {single && !editingId && single.type === 'text' && (
              <rect data-handle="resize" x={selBounds!.x + selBounds!.w - hs / 2 + 4 / view.zoom} y={selBounds!.y + selBounds!.h - hs / 2 + 4 / view.zoom} width={hs} height={hs} rx={2 / view.zoom} fill="#fff" stroke="#4a6bec" strokeWidth={1.5 / view.zoom} style={{ cursor: 'nwse-resize' }} />
            )}
            {single && !editingId && (single.type === 'arrow' || single.type === 'line') && (() => {
              const l = single as LineElement
              const midX = l.cx !== undefined ? 0.25 * l.x1 + 0.5 * l.cx + 0.25 * l.x2 : (l.x1 + l.x2) / 2
              const midY = l.cy !== undefined ? 0.25 * l.y1 + 0.5 * l.cy + 0.25 * l.y2 : (l.y1 + l.y2) / 2
              return (
                <>
                  {[1, 2].map((end) => (
                    <circle key={end} data-handle={`p${end}`} cx={end === 1 ? l.x1 : l.x2} cy={end === 1 ? l.y1 : l.y2} r={hs / 1.6} fill="#fff" stroke="#4a6bec" strokeWidth={1.5 / view.zoom} style={{ cursor: 'move' }} />
                  ))}
                  <circle
                    data-handle="curve"
                    cx={midX}
                    cy={midY}
                    r={hs / 1.8}
                    fill={l.cx !== undefined ? '#4a6bec' : '#fff'}
                    stroke="#4a6bec"
                    strokeWidth={1.5 / view.zoom}
                    style={{ cursor: 'grab' }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      updateSelected((el) => {
                        if (el.type !== 'arrow' && el.type !== 'line') return el
                        const { cx: _cx, cy: _cy, ...rest } = el
                        return rest
                      })
                    }}
                  >
                    <title>Drag to curve · Double-click to straighten</title>
                  </circle>
                </>
              )
            })()}
            {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#4a6bec14" stroke="#4a6bec" strokeWidth={1 / view.zoom} />}
          </g>
        </svg>

        {/* Text editor overlay */}
        {editing && editorStyle && (
          <textarea
            ref={(node) => {
              // Focus after mount: autoFocus alone can lose to the pointer that created the element.
              if (node && document.activeElement !== node) setTimeout(() => node.focus(), 0)
            }}
            defaultValue={'text' in editing ? (editing.text ?? '') : ''}
            onBlur={(e) => finishEditing(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) (e.target as HTMLTextAreaElement).blur()
            }}
            placeholder={editing.type === 'text' ? 'Type…' : editing.type === 'sticky' ? 'Write a note…' : 'Label'}
            className="absolute z-10 resize-none rounded-md border border-indigo-500/60 p-2 leading-[1.3] outline-none"
            style={{ ...editorStyle, fontFamily: FONT, paddingTop: editing.type === 'sticky' ? 10 * view.zoom : undefined }}
          />
        )}

        {/* Tool bar */}
        <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-surface p-1 shadow-lg">
          {TOOLS.map(({ id, label, key, icon: Icon }, i) => (
            <React.Fragment key={id}>
              {(i === 2 || i === 8 || i === 10) && <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />}
              <button
                type="button"
                onClick={() => {
                  setTool(id)
                  if (id !== 'select') setSelected(new Set())
                }}
                aria-pressed={tool === id}
                title={`${label} — ${key}`}
                className={cn('relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors', tool === id ? 'bg-indigo-600 text-white' : 'text-muted hover:bg-elevated hover:text-text')}
              >
                <Icon className="h-4 w-4" />
                <span className={cn('absolute bottom-0.5 right-1 font-mono text-[8px]', tool === id ? 'text-white/70' : 'text-muted/70')}>{key}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Style / Properties panel */}
        {showStyle && (
          <div className="absolute left-3 top-16 max-h-[calc(100%-6rem)] w-52 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur-sm animate-fade-in">
            {(tool === 'sticky' || single?.type === 'sticky') ? (
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted">Note colour</div>
                <div className="flex flex-wrap gap-1.5">
                  {STICKY_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => { setStickyColor(c); updateSelected((el) => (el.type === 'sticky' ? { ...el, color: c } : el)) }} className={cn('h-6 w-6 rounded-md border', (single?.type === 'sticky' ? single.color : stickyColor) === c ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-black/10')} style={{ background: c }} aria-label={`Note colour ${c}`} />
                  ))}
                  <label
                    className={cn(
                      'relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-md border',
                      !STICKY_COLORS.includes(single?.type === 'sticky' ? single.color : stickyColor)
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'border-border'
                    )}
                    style={{
                      background: !STICKY_COLORS.includes(single?.type === 'sticky' ? single.color : stickyColor)
                        ? (single?.type === 'sticky' ? single.color : stickyColor)
                        : 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)'
                    }}
                    title="Custom note colour"
                  >
                    <input
                      type="color"
                      value={single?.type === 'sticky' ? single.color : stickyColor}
                      onChange={(e) => {
                        const c = e.target.value
                        setStickyColor(c)
                        updateSelected((el) => (el.type === 'sticky' ? { ...el, color: c } : el))
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="Custom note colour"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                {/* Colour */}
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted">Colour</div>
                  <div className="flex flex-wrap gap-1.5">
                    {WB_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => { setColor(c); updateSelected((el) => (el.type === 'sticky' ? el : { ...el, color: c })) }} className={cn('h-6 w-6 rounded-full border', activeColor === c ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-black/15')} style={{ background: c === INK ? 'rgb(var(--text))' : c }} aria-label={`Colour ${c}`} />
                    ))}
                    <label
                      className={cn(
                        'relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border',
                        !WB_COLORS.includes(activeColor) ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-border'
                      )}
                      style={{
                        background: !WB_COLORS.includes(activeColor)
                          ? activeColor
                          : 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)'
                      }}
                      title="Custom colour"
                    >
                      <input
                        type="color"
                        value={activeColor}
                        onChange={(e) => {
                          const c = e.target.value
                          setColor(c)
                          updateSelected((el) => (el.type === 'sticky' ? el : { ...el, color: c }))
                        }}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label="Custom colour"
                      />
                    </label>
                  </div>
                </div>

                {/* Stroke Width */}
                {(tool !== 'text' && single?.type !== 'text') && (() => {
                  const currentWidth = single && 'width' in single ? single.width : width
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>Stroke</span>
                        <label className="flex items-center gap-0.5 font-mono text-text">
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={currentWidth}
                            onChange={(e) => {
                              const w = Math.max(0.5, Number(e.target.value) || 0.5)
                              setWidth(w)
                              updateSelected((el) => ('width' in el ? ({ ...el, width: w } as WbElement) : el))
                            }}
                            className="w-11 rounded border border-border bg-elevated/50 px-1 py-0.5 text-right text-[10px] text-text focus:border-indigo-500 focus:outline-none"
                            aria-label="Stroke width px"
                          />
                          <span className="text-[10px] text-muted">px</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={Math.max(48, currentWidth)}
                        step={0.5}
                        value={currentWidth}
                        onChange={(e) => {
                          const w = Number(e.target.value)
                          setWidth(w)
                          updateSelected((el) => ('width' in el ? ({ ...el, width: w } as WbElement) : el))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="Stroke width"
                      />
                      <div className="flex gap-1">
                        {WIDTHS.map((w) => (
                          <button key={w} type="button" onClick={() => { setWidth(w); updateSelected((el) => ('width' in el ? ({ ...el, width: w } as WbElement) : el)) }} className={cn('flex h-6 flex-1 items-center justify-center rounded-md', currentWidth === w ? 'bg-elevated' : 'hover:bg-elevated/60')} aria-label={`Stroke ${w}`}>
                            <span className="w-5 rounded-full bg-text" style={{ height: Math.max(1.5, w / 1.5) }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Stroke Style */}
                {(tool !== 'text' && single?.type !== 'text') && (() => {
                  const currentStyle: StrokeStyle = single && 'strokeStyle' in single && single.strokeStyle ? single.strokeStyle : strokeStyle
                  return (
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-muted">Stroke Style</div>
                      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-elevated/40 p-0.5">
                        {(['solid', 'dashed', 'dotted'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setStrokeStyle(st)
                              updateSelected((el) => ('width' in el ? ({ ...el, strokeStyle: st } as WbElement) : el))
                            }}
                            className={cn(
                              'rounded py-1 text-[10px] font-medium capitalize transition-colors',
                              currentStyle === st ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                            )}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Fill + Fill Colour */}
                {(['rect', 'ellipse', 'diamond'].includes(tool) || (single && (single.type === 'rect' || single.type === 'ellipse' || single.type === 'diamond'))) && (() => {
                  const isFilled = single && 'fill' in single ? single.fill : fill
                  const activeFill = (single && 'fillColor' in single && single.fillColor) || fillColor || activeColor
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = !isFilled
                            setFill(next)
                            updateSelected((el) => ('fill' in el ? { ...el, fill: next } : el))
                          }}
                          className={cn('flex h-7 flex-1 items-center gap-2 rounded-md px-2 text-xs', isFilled ? 'bg-elevated text-text' : 'text-muted hover:bg-elevated/60')}
                        >
                          <PaintBucket className="h-3.5 w-3.5" /> Fill
                        </button>
                        {isFilled && (
                          <label className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border" style={{ background: activeFill === INK ? 'rgb(var(--text))' : activeFill }} title="Fill colour">
                            <input
                              type="color"
                              value={activeFill}
                              onChange={(e) => {
                                const c = e.target.value
                                setFillColor(c)
                                updateSelected((el) => ('fill' in el ? { ...el, fill: true, fillColor: c } : el))
                              }}
                              className="absolute inset-0 cursor-pointer opacity-0"
                              aria-label="Fill colour"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Corner Radius (rect) */}
                {(tool === 'rect' || single?.type === 'rect') && (() => {
                  const base = single?.type === 'rect' ? (single.rx ?? 8) : cornerRadius
                  const corners: [number, number, number, number] =
                    single?.type === 'rect' && single.corners ? single.corners : [base, base, base, base]
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>Radius</span>
                        <label className="flex items-center gap-0.5 font-mono text-text">
                          <input
                            type="number"
                            min={0}
                            value={Math.round(base)}
                            onChange={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0)
                              setCornerRadius(v)
                              updateSelected((el) => (el.type === 'rect' ? { ...el, rx: v, corners: [v, v, v, v] } : el))
                            }}
                            className="w-11 rounded border border-border bg-elevated/50 px-1 py-0.5 text-right text-[10px] text-text focus:border-indigo-500 focus:outline-none"
                            aria-label="Corner radius px"
                          />
                          <span className="text-[10px] text-muted">px</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(200, base)}
                        step={2}
                        value={base}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setCornerRadius(v)
                          updateSelected((el) => (el.type === 'rect' ? { ...el, rx: v, corners: [v, v, v, v] } : el))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="Corner radius"
                      />
                      {single?.type === 'rect' && (
                        <div className="grid grid-cols-4 gap-1">
                          {(['TL', 'TR', 'BR', 'BL'] as const).map((lbl, idx) => (
                            <label key={lbl} className="flex flex-col items-center gap-0.5 text-[9px] text-muted">
                              <span>{lbl}</span>
                              <input
                                type="number"
                                min={0}
                                value={Math.round(corners[idx])}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0)
                                  updateSelected((el) => {
                                    if (el.type !== 'rect') return el
                                    const next: [number, number, number, number] = el.corners ? [...el.corners] : [base, base, base, base]
                                    next[idx] = val
                                    return { ...el, corners: next }
                                  })
                                }}
                                className="h-6 w-full rounded border border-border bg-elevated/50 px-1 text-center font-mono text-[10px] text-text focus:border-indigo-500 focus:outline-none"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* 3D Depth & Angle (shapes) */}
                {(['rect', 'ellipse', 'diamond'].includes(tool) || (single && (single.type === 'rect' || single.type === 'ellipse' || single.type === 'diamond'))) && (() => {
                  const d = single && 'depth' in single ? (single.depth ?? 0) : depth
                  const ang = single && 'depthAngle' in single ? (single.depthAngle ?? 35) : 35
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>3D Depth</span>
                        <label className="flex items-center gap-0.5 font-mono text-text">
                          <input
                            type="number"
                            min={0}
                            value={Math.round(d)}
                            onChange={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0)
                              setDepth(v)
                              updateSelected((el) => (el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond' ? { ...el, depth: v } : el))
                            }}
                            className="w-11 rounded border border-border bg-elevated/50 px-1 py-0.5 text-right text-[10px] text-text focus:border-indigo-500 focus:outline-none"
                            aria-label="3D depth px"
                          />
                          <span className="text-[10px] text-muted">px</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(120, d)}
                        step={2}
                        value={d}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setDepth(v)
                          updateSelected((el) => (el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond' ? { ...el, depth: v } : el))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="3D depth"
                      />
                      {d > 0 && single && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                            <span>3D Angle</span>
                            <span className="font-mono tabular-nums text-text">{Math.round(ang)}°</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={5}
                            value={ang}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              updateSelected((el) => (el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond' ? { ...el, depthAngle: v } : el))
                            }}
                            className="w-full accent-indigo-500"
                            aria-label="3D angle"
                          />
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Rotation (when selected) */}
                {single && (() => {
                  const rot = single.rotation ?? 0
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>Rotate</span>
                        <button
                          type="button"
                          onClick={() => updateSelected((el) => ({ ...el, rotation: 0 }))}
                          className="font-mono tabular-nums text-text hover:text-indigo-400"
                          title="Reset rotation"
                        >
                          {Math.round(rot)}°
                        </button>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        step={5}
                        value={((rot % 360) + 360) % 360}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          updateSelected((el) => ({ ...el, rotation: v }))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="Rotation"
                      />
                    </div>
                  )
                })()}

                {/* Font Size (text) */}
                {(tool === 'text' || single?.type === 'text') && (() => {
                  const sz = single?.type === 'text' ? single.size : fontSize
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                        <span>Font Size</span>
                        <label className="flex items-center gap-0.5 font-mono text-text">
                          <input
                            type="number"
                            min={1}
                            value={Math.round(sz)}
                            onChange={(e) => {
                              const v = Math.max(1, Number(e.target.value) || 1)
                              setFontSize(v)
                              updateSelected((el) => (el.type === 'text' ? { ...el, size: v } : el))
                            }}
                            className="w-11 rounded border border-border bg-elevated/50 px-1 py-0.5 text-right text-[10px] text-text focus:border-indigo-500 focus:outline-none"
                            aria-label="Font size px"
                          />
                          <span className="text-[10px] text-muted">px</span>
                        </label>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={Math.max(120, sz)}
                        step={2}
                        value={sz}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setFontSize(v)
                          updateSelected((el) => (el.type === 'text' ? { ...el, size: v } : el))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="Font size"
                      />
                    </div>
                  )
                })()}
              </>
            )}

            {/* Animation (when selected) */}
            {single && (() => {
              const anim: ElementAnimation = single.animation ?? 'none'
              const spd = single.animationSpeed ?? 1
              return (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-muted">Animation</div>
                  <div className="grid grid-cols-5 gap-0.5 rounded-md border border-border bg-elevated/40 p-0.5">
                    {(['none', 'pulse', 'float', 'spin', 'bounce'] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => updateSelected((el) => ({ ...el, animation: a }))}
                        className={cn(
                          'rounded py-1 text-[9px] font-medium capitalize transition-colors',
                          anim === a ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  {anim !== 'none' && (
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-muted">
                        <span>Speed</span>
                        <span className="font-mono text-text">{spd.toFixed(1)}×</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={3}
                        step={0.25}
                        value={spd}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          updateSelected((el) => ({ ...el, animationSpeed: v }))
                        }}
                        className="w-full accent-indigo-500"
                        aria-label="Animation speed"
                      />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Opacity (all elements) */}
            {(() => {
              const op = single?.opacity ?? opacity
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                    <span>Opacity</span>
                    <span className="font-mono tabular-nums text-text">{Math.round(op * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={op}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setOpacity(v)
                      updateSelected((el) => ({ ...el, opacity: v }))
                    }}
                    className="w-full accent-indigo-500"
                    aria-label="Opacity"
                  />
                </div>
              )
            })()}

            {/* Layer & Edit actions */}
            {selectedEls.length > 0 && (
              <div className="grid grid-cols-4 gap-1 border-t border-border pt-2">
                <button type="button" onClick={bringToFront} className="flex h-7 items-center justify-center rounded-md text-xs text-muted hover:bg-elevated hover:text-text" title="Bring to front">
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={sendToBack} className="flex h-7 items-center justify-center rounded-md text-xs text-muted hover:bg-elevated hover:text-text" title="Send to back">
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => duplicateSelected()} className="flex h-7 items-center justify-center rounded-md text-xs text-muted hover:bg-elevated hover:text-text" title="Duplicate (Ctrl+D)">
                  <CopyPlus className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={deleteSelected} className="flex h-7 items-center justify-center rounded-md text-xs text-muted hover:bg-rose-500/10 hover:text-rose-500" title="Delete (Del)">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layers & Layout panel */}
        <WbLayersPanel
          open={layersOpen}
          onToggleOpen={() => setLayersOpen((o) => !o)}
          elements={elements}
          selected={selected}
          snapToGrid={snapToGrid}
          onToggleSnap={() => setSnapToGrid((s) => !s)}
          onSelect={(ids) => {
            setSelected(ids)
            setTool('select')
          }}
          onToggleHidden={toggleHidden}
          onToggleLocked={toggleLocked}
          onMoveLayer={moveLayer}
          onGroup={groupSelected}
          onUngroup={ungroupSelected}
          onAlign={alignSelected}
        />

        {/* Zoom + history */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1">
          <div className="flex items-center rounded-lg border border-border bg-surface shadow-sm">
            <button type="button" onClick={() => zoomAt(1 / 1.2)} className="p-1.5 text-muted hover:text-text" title="Zoom out (Ctrl −)" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
            <button type="button" onClick={() => setView((v) => ({ ...v, zoom: 1 }))} className="w-12 text-center text-[11px] tabular-nums text-text" title="Reset to 100%">{Math.round(view.zoom * 100)}%</button>
            <button type="button" onClick={() => zoomAt(1.2)} className="p-1.5 text-muted hover:text-text" title="Zoom in (Ctrl +)" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
            <button type="button" onClick={fitToContent} className="border-l border-border p-1.5 text-muted hover:text-text" title="Fit to content (Ctrl 0)" aria-label="Fit to content"><Maximize className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center rounded-lg border border-border bg-surface shadow-sm">
            <button type="button" onClick={undo} disabled={!past.length} className="p-1.5 text-muted hover:text-text disabled:opacity-30" title="Undo (Ctrl Z)" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
            <button type="button" onClick={redo} disabled={!future.length} className="p-1.5 text-muted hover:text-text disabled:opacity-30" title="Redo (Ctrl Shift Z)" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
          </div>
          <div className="relative flex items-center rounded-lg border border-border bg-surface shadow-sm">
            <button
              type="button"
              onClick={() => setView3D((v) => !v)}
              className={cn('flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors', view3D ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text')}
              title="Toggle 3D Perspective View"
            >
              <Box className="h-3.5 w-3.5" />
              <span>3D</span>
            </button>
            {view3D && (
              <div className="absolute bottom-10 left-0 z-20 w-48 space-y-2 rounded-xl border border-border bg-surface/95 p-2.5 text-[11px] shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between font-medium text-text">
                  <span>3D View</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTiltX(24)
                      setTiltY(-18)
                    }}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Reset
                  </button>
                </div>
                <label className="block space-y-0.5 text-muted">
                  <div className="flex justify-between">
                    <span>Tilt X</span>
                    <span className="font-mono text-text">{tiltX}°</span>
                  </div>
                  <input type="range" min={-55} max={55} value={tiltX} onChange={(e) => setTiltX(Number(e.target.value))} className="w-full accent-indigo-500" />
                </label>
                <label className="block space-y-0.5 text-muted">
                  <div className="flex justify-between">
                    <span>Tilt Y</span>
                    <span className="font-mono text-text">{tiltY}°</span>
                  </div>
                  <input type="range" min={-55} max={55} value={tiltY} onChange={(e) => setTiltY(Number(e.target.value))} className="w-full accent-indigo-500" />
                </label>
              </div>
            )}
          </div>
        </div>

        {elements.length === 0 && !draft && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center text-sm text-muted">
              <p className="font-medium text-text">Start sketching</p>
              <p className="mt-1 text-xs">Pick a tool above, or double-click anywhere to write · Space + drag to pan · Ctrl + scroll to zoom</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Export as SVG or Code</DialogTitle>
            <DialogDescription>Customize size, padding, stroke, color, transforms, and background, then copy or download.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-elevated/50 p-1">
              {(['svg', 'jsx', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setCodeFormat(fmt)
                    setCopiedCode(false)
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    codeFormat === fmt ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
                  )}
                >
                  {fmt === 'svg' ? 'SVG' : fmt === 'jsx' ? 'React JSX' : 'JSON'}
                </button>
              ))}
            </div>
            {codeFormat !== 'json' && (
              <button
                type="button"
                onClick={() => setExportConfig(DEFAULT_EXPORT_CONFIG)}
                className="text-xs text-muted hover:text-text"
              >
                Reset config
              </button>
            )}
          </div>

          <div className={cn('grid gap-4', codeFormat !== 'json' ? 'md:grid-cols-[260px_1fr]' : 'grid-cols-1')}>
            {codeFormat !== 'json' && (
              <div className="space-y-3 rounded-lg border border-border bg-elevated/30 p-3 text-xs">
                {/* Live preview */}
                <div
                  className="flex h-36 items-center justify-center overflow-hidden rounded-md border border-border p-2"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, rgb(var(--border) / 0.35) 25%, transparent 25%), linear-gradient(-45deg, rgb(var(--border) / 0.35) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(var(--border) / 0.35) 75%), linear-gradient(-45deg, transparent 75%, rgb(var(--border) / 0.35) 75%)',
                    backgroundSize: '14px 14px',
                    backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0'
                  }}
                >
                  {exportPreviewUrl && <img src={exportPreviewUrl} alt="SVG preview" className="max-h-full max-w-full object-contain" />}
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Size</span>
                    <span className="font-mono tabular-nums text-text">{exportConfig.size > 0 ? `${exportConfig.size}px` : 'Auto'}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={512}
                    step={8}
                    value={exportConfig.size}
                    onChange={(e) => setExportConfig((c) => ({ ...c, size: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Padding */}
                <div className="space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Padding</span>
                    <span className="font-mono tabular-nums text-text">{exportConfig.paddingPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={exportConfig.paddingPct}
                    onChange={(e) => setExportConfig((c) => ({ ...c, paddingPct: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Thickness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Thickness</span>
                    <span className="font-mono tabular-nums text-text">{exportConfig.strokeOverride > 0 ? `${exportConfig.strokeOverride}px` : 'Original'}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={exportConfig.strokeOverride}
                    onChange={(e) => setExportConfig((c) => ({ ...c, strokeOverride: Number(e.target.value) }))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Line Color */}
                <div className="space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Line Color</span>
                    {exportConfig.colorOverride && (
                      <button type="button" onClick={() => setExportConfig((c) => ({ ...c, colorOverride: '' }))} className="text-[11px] text-indigo-400 hover:underline">
                        Original
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-1">
                    <input
                      type="color"
                      value={exportConfig.colorOverride || '#18181b'}
                      onChange={(e) => setExportConfig((c) => ({ ...c, colorOverride: e.target.value }))}
                      className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                      aria-label="Line color"
                    />
                    <input
                      type="text"
                      value={exportConfig.colorOverride}
                      placeholder="Original"
                      onChange={(e) => setExportConfig((c) => ({ ...c, colorOverride: e.target.value }))}
                      className="w-full bg-transparent font-mono text-xs text-text placeholder:text-muted/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Flip / Mirror */}
                <div className="space-y-1">
                  <span className="text-muted">Flip / Mirror</span>
                  <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-surface p-0.5">
                    {([
                      ['none', 'None'],
                      ['h', 'Flip H'],
                      ['v', 'Flip V'],
                      ['both', 'Both']
                    ] as [FlipMode, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setExportConfig((c) => ({ ...c, flip: val }))}
                        className={cn(
                          'rounded py-1 text-[11px] font-medium transition-colors',
                          exportConfig.flip === val ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div className="space-y-1">
                  <span className="text-muted">Rotation</span>
                  <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-surface p-0.5">
                    {([0, 90, 180, 270] as const).map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => setExportConfig((c) => ({ ...c, rotation: deg }))}
                        className={cn(
                          'rounded py-1 text-[11px] font-medium transition-colors',
                          exportConfig.rotation === deg ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text'
                        )}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* BG Shape */}
                <div className="space-y-1">
                  <span className="text-muted">BG Shape</span>
                  <div className="grid grid-cols-4 gap-1 rounded-md border border-border bg-surface p-0.5">
                    {([
                      ['none', 'None'],
                      ['square', 'Square'],
                      ['rounded', 'Round'],
                      ['circle', 'Circle']
                    ] as [BgShape, string][]).map(([shape, label]) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => setExportConfig((c) => ({ ...c, bgShape: shape }))}
                        className={cn(
                          'rounded py-1 text-[11px] font-medium transition-colors',
                          exportConfig.bgShape === shape ? 'bg-indigo-600 text-white' : 'text-muted hover:text-text'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BG Color */}
                {exportConfig.bgShape !== 'none' && (
                  <div className="space-y-1">
                    <span className="text-muted">BG Color</span>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-1">
                      <input
                        type="color"
                        value={exportConfig.bgColor}
                        onChange={(e) => setExportConfig((c) => ({ ...c, bgColor: e.target.value }))}
                        className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                        aria-label="Background color"
                      />
                      <input
                        type="text"
                        value={exportConfig.bgColor}
                        onChange={(e) => setExportConfig((c) => ({ ...c, bgColor: e.target.value }))}
                        className="w-full bg-transparent font-mono text-xs text-text focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <pre className="max-h-[55vh] overflow-auto rounded-lg border border-border bg-elevated/40 p-3 font-mono text-xs leading-relaxed text-text">
              <code>{exportCodeText}</code>
            </pre>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={downloadExportCode}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-elevated"
            >
              <Download className="h-3.5 w-3.5" /> Download .{codeFormat === 'jsx' ? 'tsx' : codeFormat}
            </button>
            <button
              type="button"
              onClick={() => void copyExportCode()}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import SVG to Board</DialogTitle>
            <DialogDescription>Choose an .svg file or paste SVG markup below. You can also press Ctrl+V directly on the canvas.</DialogDescription>
          </DialogHeader>
          <input ref={svgFileInputRef} type="file" accept=".svg,image/svg+xml" onChange={handleImportSvgFile} className="hidden" />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => svgFileInputRef.current?.click()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-elevated"
            >
              <Upload className="h-3.5 w-3.5" /> Choose .svg file
            </button>
            <span className="text-xs text-muted">Supports rect, circle, ellipse, line, path, polygon, text</span>
          </div>
          <textarea
            value={importSvgText}
            onChange={(e) => setImportSvgText(e.target.value)}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">...</svg>'
            rows={9}
            className="w-full rounded-lg border border-border bg-elevated/40 p-3 font-mono text-xs text-text placeholder:text-muted/60 focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text hover:bg-elevated"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!importSvgText.trim()}
              onClick={() => {
                if (insertSvgToBoard(importSvgText)) setImportModalOpen(false)
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              Add to board
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
