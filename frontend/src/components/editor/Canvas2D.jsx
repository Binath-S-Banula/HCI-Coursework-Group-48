import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import '../../styles/editor/Canvas2D.css'
import { useSelector } from 'react-redux'

const GRID = 10
const WORLD_COLS = 50   // 20 major squares wide
const WORLD_ROWS = 50   // 20 major squares tall
const MAJOR = GRID * 10 // 100 world units per major square
const WORLD_W = WORLD_COLS * MAJOR  // 2000 world units
const WORLD_H = WORLD_ROWS * MAJOR  // 2000 world units

const CM_PER_WORLD_UNIT = 1
const LEGACY_CM_PER_WORLD_UNIT = 5
const WORLD_UNITS_PER_CM = 1 / CM_PER_WORLD_UNIT
const WALL_THICKNESS_CM = 7
const WALL_THICKNESS_WORLD = WALL_THICKNESS_CM * WORLD_UNITS_PER_CM
const WALL_HALF_THICKNESS_WORLD = WALL_THICKNESS_WORLD / 2
const snap = (v) => Math.round(v / GRID) * GRID
const HANDLE_R = 6
const ROT_OFFSET = 28

const worldToCm = (worldValue) => Math.round(Number(worldValue || 0) * CM_PER_WORLD_UNIT)
const cmToWorld = (cmValue) => Number(cmValue || 0) * WORLD_UNITS_PER_CM

const OPENING_PRESETS = {
  door: {
    single:  { width: 90,  label: 'Single Door' },
    double:  { width: 160, label: 'Double Door' },
    sliding: { width: 150, label: 'Sliding Door' },
  },
  window: {
    casement: { width: 120, label: 'Casement Window' },
    sliding:  { width: 150, label: 'Sliding Window' },
    bay:      { width: 180, label: 'Bay Window' },
  },
}

const getAdminAssets = () => JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[],"textures":[]}')

const normalizeOpeningWidthCm = (width, fallback = 90) => {
  const value = Number(width)
  if (!Number.isFinite(value) || value <= 0) return fallback
  if (value <= 12) return value * 100
  if (value > 1000) return value / 10
  if (value <= 45) return value * LEGACY_CM_PER_WORLD_UNIT
  return value
}

const normalizeFurnitureSizeCm = (value, fallback = 80) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  if (parsed <= 12) return parsed * 100
  if (parsed > 1000) return parsed / 10
  return parsed
}

const getDefaultFurnitureSizeCm = (categoryOrName = '') => {
  const key = String(categoryOrName || '').toLowerCase()
  if (key.includes('sofa') || key.includes('couch')) return { width: 220, depth: 95 }
  if (key.includes('chair') || key.includes('armchair') || key.includes('stool')) return { width: 60, depth: 60 }
  if (key.includes('table') || key.includes('desk') || key.includes('coffee')) return { width: 160, depth: 90 }
  if (key.includes('bed')) return { width: 180, depth: 200 }
  if (key.includes('storage') || key.includes('cabinet') || key.includes('shelf') || key.includes('wardrobe')) return { width: 90, depth: 45 }
  if (key.includes('light') || key.includes('lamp')) return { width: 45, depth: 45 }
  if (key.includes('kitchen')) return { width: 120, depth: 60 }
  if (key.includes('bathroom')) return { width: 80, depth: 60 }
  if (key.includes('decor')) return { width: 60, depth: 60 }
  return { width: 100, depth: 80 }
}

// ── Clamp pan so the world rect always stays fully visible ───────────────────
function clampPan(px, py, zoom, canvasW, canvasH) {
  const scaledW = WORLD_W * zoom
  const scaledH = WORLD_H * zoom
  // If world is smaller than canvas, center it; otherwise clamp edges
  const clampX = scaledW <= canvasW
    ? (canvasW - scaledW) / 2
    : Math.min(0, Math.max(canvasW - scaledW, px))
  const clampY = scaledH <= canvasH
    ? (canvasH - scaledH) / 2
    : Math.min(0, Math.max(canvasH - scaledH, py))
  return { x: clampX, y: clampY }
}

// ── Hit-test helpers ─────────────────────────────────────────────────────────
function getItemHandles(item) {
  const { x, y, w, h, angle = 0 } = item
  const cx = x + w / 2, cy = y + h / 2
  const rot = (px, py) => {
    const dx = px - cx, dy = py - cy
    const cos = Math.cos(angle), sin = Math.sin(angle)
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
  }
  return {
    tl:  rot(x,     y),
    tr:  rot(x + w, y),
    br:  rot(x + w, y + h),
    bl:  rot(x,     y + h),
    rot: rot(cx,    y - ROT_OFFSET),
  }
}

function distSq(ax, ay, bx, by) { return (ax - bx) ** 2 + (ay - by) ** 2 }

function hitHandle(mx, my, item, zoom) {
  const r = (HANDLE_R + 2) / zoom
  const h = getItemHandles(item)
  for (const [name, pt] of Object.entries(h)) {
    if (distSq(mx, my, pt.x, pt.y) < r * r) return name
  }
  return null
}

function hitItem(mx, my, item) {
  const { x, y, w, h, angle = 0 } = item
  const cx = x + w / 2, cy = y + h / 2
  const cos = Math.cos(-angle), sin = Math.sin(-angle)
  const dx = mx - cx, dy = my - cy
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2
}

function getNearestWallPoint(mx, my, walls, maxDist = 30) {
  let best = null
  walls.forEach((wall) => {
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const len2 = dx * dx + dy * dy
    if (!len2) return
    const t = Math.max(0.05, Math.min(0.95, ((mx - wall.start.x) * dx + (my - wall.start.y) * dy) / len2))
    const px = wall.start.x + t * dx
    const py = wall.start.y + t * dy
    const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2)
    if (dist <= maxDist && (!best || dist < best.dist)) {
      best = { wall, t, px, py, dist }
    }
  })
  return best
}

export default function Canvas2D({ onDesignChange }) {
  const rootRef    = useRef(null)
  const canvasRef  = useRef(null)
  const fileRef    = useRef(null)
  const { activeTool, showGrid, zoom, openingDesigns } = useSelector((s) => s.editor)

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning  = useRef(false)
  const panStart   = useRef({ x: 0, y: 0 })

  const [assets,          setAssets]          = useState(getAdminAssets)
  const [walls,           setWalls]           = useState(() => window.__editorWalls    || [])
  const [drawStart,       setDrawStart]       = useState(null)
  const [mousePos,        setMousePos]        = useState({ x: 0, y: 0 })
  const [placed,          setPlaced]          = useState(() => window.__editorPlaced   || [])
  const [openings,        setOpenings]        = useState(() => window.__editorOpenings || [])
  const [selectedItem,    setSelectedItem]    = useState(null)
  const [selectedWall,    setSelectedWall]    = useState(null)
  const [selectedOpening, setSelectedOpening] = useState(null)
  const [bgImage,         setBgImage]         = useState(null)
  const [bgOpacity,       setBgOpacity]       = useState(0.3)
  const [floorTex,        setFloorTex]        = useState(() => window.__editorFloorTex   || null)
  const [floorRect,       setFloorRect]       = useState(() => window.__editorFloor      || null)
  const [floorColor,      setFloorColor]      = useState(() => window.__editorFloorColor || '#f5f2ee')
  const [wallTex,         setWallTex]         = useState(() => window.__editorWallTex    || null)
  const [wallColor,       setWallColor]       = useState(() => window.__editorWallColor  || '#e8e2d8')
  const [texPanel,        setTexPanel]        = useState(false)
  const [loadedImages,    setLoadedImages]    = useState({})
  const [canvasViewport,  setCanvasViewport]  = useState({ width: 0, height: 0 })

  const dragState      = useRef(null)
  const wallsRef       = useRef(walls)
  useEffect(() => { wallsRef.current = walls }, [walls])
  const placedRef      = useRef(placed)
  useEffect(() => { placedRef.current = placed }, [placed])
  const openingsRef    = useRef(openings)
  useEffect(() => { openingsRef.current = openings }, [openings])
  const selectedRef    = useRef(selectedItem)
  useEffect(() => { selectedRef.current = selectedItem }, [selectedItem])
  const panRef         = useRef(pan)
  useEffect(() => { panRef.current = pan }, [pan])
  const zoomRef        = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  const viewportRef    = useRef(canvasViewport)
  useEffect(() => { viewportRef.current = canvasViewport }, [canvasViewport])
  const queuedPointerRef = useRef(null)
  const moveRafRef       = useRef(null)

  // ── Center world on first mount ──────────────────────────────────────
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cw = canvas.offsetWidth  || 900
    const ch = canvas.offsetHeight || 550
    const init = clampPan((cw - WORLD_W * zoom) / 2, (ch - WORLD_H * zoom) / 2, zoom, cw, ch)
    setPan(init)
    panRef.current = init
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Admin assets reload ──────────────────────────────────────────────
  useEffect(() => {
    const onFocus = () => setAssets(getAdminAssets())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let rafId = null
    const syncViewport = () => {
      const width  = Math.max(1, Math.round(canvas.clientWidth  || canvas.offsetWidth  || 900))
      const height = Math.max(1, Math.round(canvas.clientHeight || canvas.offsetHeight || 550))
      setCanvasViewport((prev) => {
        if (prev.width === width && prev.height === height) return prev
        return { width, height }
      })
    }
    const scheduleSync = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(syncViewport)
    }
    syncViewport()
    const ro = new ResizeObserver(scheduleSync)
    ro.observe(canvas)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    window.addEventListener('resize', scheduleSync)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('resize', scheduleSync)
    }
  }, [])

  useEffect(() => {
    const all = [...assets.furniture, ...assets.textures]
    all.forEach(item => {
      if (loadedImages[item.id]) return
      const img = new Image()
      img.onload = () => setLoadedImages(prev => ({ ...prev, [item.id]: img }))
      img.src = item.image
    })
  }, [assets])

  useEffect(() => {
    placed.forEach(p => {
      if (loadedImages[p.id]) return
      const img = new Image()
      img.onload = () => setLoadedImages(prev => ({ ...prev, [p.id]: img }))
      img.src = p.image
    })
  }, [placed])

  useEffect(() => {
    window.__editorWalls      = walls
    window.__editorPlaced     = placed
    window.__editorOpenings   = openings
    window.__editorFloorTex   = floorTex
    window.__editorFloor      = floorRect
    window.__editorFloorColor = floorColor
    window.__editorWallTex    = wallTex
    window.__editorWallColor  = wallColor
    window.dispatchEvent(new Event('editor-state-change'))
    if (onDesignChange) onDesignChange({ walls, placed, openings, floorTex, floorRect, floorColor, wallTex, wallColor })
  }, [walls, placed, openings, floorTex, floorRect, floorColor, wallTex, wallColor])

  useEffect(() => {
    if (!window.__editorRestoreSignal) return
    const w  = window.__editorWalls      || []
    const p  = window.__editorPlaced     || []
    const o  = window.__editorOpenings   || []
    const f  = window.__editorFloorTex   || null
    const fr = window.__editorFloor      || null
    const fc = window.__editorFloorColor || '#f5f2ee'
    const t  = window.__editorWallTex    || null
    const wc = window.__editorWallColor  || '#e8e2d8'
    setWalls(w); setPlaced(p); setOpenings(o)
    setFloorTex(f); setFloorRect(fr); setFloorColor(fc); setWallTex(t); setWallColor(wc)
    undoStack.current = []
    redoStack.current = []
    delete window.__editorRestoreSignal
  }, [])

  // ── Undo / Redo ──────────────────────────────────────────────────────
  const undoStack = useRef([])
  const redoStack = useRef([])

  const getSnap = () => ({
    walls:    wallsRef.current.map(w => ({ ...w })),
    placed:   placedRef.current.map(p => ({ ...p })),
    openings: openingsRef.current.map(o => ({ ...o })),
  })

  const applySnap = (s) => {
    wallsRef.current    = s.walls
    placedRef.current   = s.placed
    openingsRef.current = s.openings
    setWalls(s.walls); setPlaced(s.placed); setOpenings(s.openings)
    window.__editorWalls    = s.walls
    window.__editorPlaced   = s.placed
    window.__editorOpenings = s.openings
  }

  const pushHistory = useCallback((newWalls, newPlaced, newOpenings) => {
    const w = newWalls    !== undefined ? newWalls    : wallsRef.current
    const p = newPlaced   !== undefined ? newPlaced   : placedRef.current
    const o = newOpenings !== undefined ? newOpenings : openingsRef.current
    undoStack.current.push(getSnap())
    redoStack.current = []
    wallsRef.current    = w
    placedRef.current   = p
    openingsRef.current = o
    setWalls(w); setPlaced(p); setOpenings(o)
    window.__editorWalls    = w
    window.__editorPlaced   = p
    window.__editorOpenings = o
  }, [])

  const undo = useCallback(() => {
    if (!undoStack.current.length) return
    redoStack.current.push(getSnap())
    applySnap(undoStack.current.pop())
  }, [])

  const redo = useCallback(() => {
    if (!redoStack.current.length) return
    undoStack.current.push(getSnap())
    applySnap(redoStack.current.pop())
  }, [])

  window.__editorClearHistory = () => { undoStack.current = []; redoStack.current = [] }
  useEffect(() => { window.__editorUndo = undo; window.__editorRedo = redo }, [undo, redo])

  const deleteSelectedWall = useCallback(() => {
    if (selectedWall === null) return false
    pushHistory(wallsRef.current.filter(w => w.id !== selectedWall), placedRef.current, openingsRef.current)
    setSelectedWall(null); setSelectedItem(null); setSelectedOpening(null)
    return true
  }, [selectedWall, pushHistory])

  const deleteSelectedOpening = useCallback(() => {
    if (selectedOpening === null) return false
    pushHistory(wallsRef.current, placedRef.current, openingsRef.current.filter(o => o.id !== selectedOpening))
    setSelectedOpening(null); setSelectedItem(null); setSelectedWall(null)
    return true
  }, [selectedOpening, pushHistory])

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Escape') { setDrawStart(null); setSelectedWall(null); setSelectedItem(null); setSelectedOpening(null) }
      if (e.key === 'Delete') {
        if (deleteSelectedWall()) return
        if (deleteSelectedOpening()) return
        if (selectedItem !== null) {
          pushHistory(wallsRef.current, placedRef.current.filter(p => p.id !== selectedItem), openingsRef.current)
          setSelectedItem(null)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedItem, pushHistory, deleteSelectedWall, deleteSelectedOpening])

  // ── Draw ─────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const nextW = canvasViewport.width  || canvas.offsetWidth  || 900
    const nextH = canvasViewport.height || canvas.offsetHeight || 550
    if (canvas.width  !== nextW) canvas.width  = nextW
    if (canvas.height !== nextH) canvas.height = nextH
    const CW = canvas.width, CH = canvas.height

    // Chrome outside the world (dark border area)
    ctx.fillStyle = '#9aa0af'
    ctx.fillRect(0, 0, CW, CH)

    // World position & size in screen pixels
    const wx = Math.round(pan.x)
    const wy = Math.round(pan.y)
    const ww = Math.round(WORLD_W * zoom)
    const wh = Math.round(WORLD_H * zoom)

    // Subtle shadow around world rect
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#eef1f7'
    ctx.fillRect(wx, wy, ww, wh)
    ctx.shadowBlur = 0

    // Clip everything inside world bounds
    ctx.save()
    ctx.beginPath()
    ctx.rect(wx, wy, ww, wh)
    ctx.clip()

    // World transform
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Floor rect
    if (floorRect && floorRect.w > 0 && floorRect.h > 0) {
      if (floorTex && loadedImages[floorTex.id]) {
        ctx.fillStyle = ctx.createPattern(loadedImages[floorTex.id], 'repeat') || floorColor
      } else {
        ctx.fillStyle = floorColor
      }
      ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h)

      if (!floorTex) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.7
        for (let x = floorRect.x; x <= floorRect.x + floorRect.w; x += GRID) {
          ctx.beginPath(); ctx.moveTo(x, floorRect.y); ctx.lineTo(x, floorRect.y + floorRect.h); ctx.stroke()
        }
        for (let y = floorRect.y; y <= floorRect.y + floorRect.h; y += GRID) {
          ctx.beginPath(); ctx.moveTo(floorRect.x, y); ctx.lineTo(floorRect.x + floorRect.w, y); ctx.stroke()
        }
      }

      ctx.strokeStyle = 'rgba(67,217,173,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
      ctx.strokeRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h)
      ctx.setLineDash([])
    }

    // Blueprint bg
    if (bgImage) {
      ctx.globalAlpha = bgOpacity
      const sc = Math.min(WORLD_W / bgImage.width, WORLD_H / bgImage.height)
      ctx.drawImage(bgImage, (WORLD_W - bgImage.width * sc) / 2, (WORLD_H - bgImage.height * sc) / 2, bgImage.width * sc, bgImage.height * sc)
      ctx.globalAlpha = 1
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.055)'; ctx.lineWidth = 0.45
      for (let x = 0; x <= WORLD_W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke() }
      for (let y = 0; y <= WORLD_H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke() }
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.9
      for (let x = 0; x <= WORLD_W; x += MAJOR) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke() }
      for (let y = 0; y <= WORLD_H; y += MAJOR) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke() }
    }

    // World border line
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H)

    // ── Furniture ────────────────────────────────────────────────────
    placed.forEach(item => {
      const isSelected = selectedItem === item.id
      const img = loadedImages[item.id]
      const { x, y, w, h, angle = 0 } = item
      const cx = x + w / 2, cy = y + h / 2

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)

      if (isSelected) {
        ctx.strokeStyle = '#6c63ff'; ctx.lineWidth = 2 / zoom
        ctx.setLineDash([4 / zoom, 3 / zoom])
        ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6)
        ctx.setLineDash([])
      }

      if (img) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      } else {
        ctx.fillStyle = 'rgba(108,99,255,0.15)'; ctx.fillRect(-w / 2, -h / 2, w, h)
        ctx.fillStyle = '#888'; ctx.font = `${10 / zoom}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(item.name, 0, 0)
      }

      const itemColor = item.color || '#8b6b4a'
      const badgeR = 5 / zoom, badgePad = 3 / zoom
      const badgeX = w / 2 - badgeR - badgePad, badgeY = -h / 2 + badgeR + badgePad
      ctx.beginPath(); ctx.arc(badgeX, badgeY, badgeR + 1.5 / zoom, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()
      ctx.beginPath(); ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2); ctx.fillStyle = itemColor; ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.9 / zoom; ctx.stroke()
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
      ctx.fillText(item.name, 0, h / 2 + 12 / zoom)
      ctx.restore()

      if (isSelected) {
        const handles = getItemHandles(item)
        const hr = HANDLE_R / zoom
        ;[handles.tl, handles.tr, handles.br, handles.bl].forEach(pt => {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, hr, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#6c63ff'; ctx.lineWidth = 1.5 / zoom; ctx.stroke()
        })
        ctx.setLineDash([3 / zoom, 3 / zoom]); ctx.strokeStyle = 'rgba(108,99,255,0.5)'; ctx.lineWidth = 1 / zoom
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(handles.rot.x, handles.rot.y); ctx.stroke(); ctx.setLineDash([])
        ctx.beginPath(); ctx.arc(handles.rot.x, handles.rot.y, hr * 1.2, 0, Math.PI * 2); ctx.fillStyle = '#6c63ff'; ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = `bold ${10 / zoom}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('↻', handles.rot.x, handles.rot.y + 3.5 / zoom)
        const bw = 52 / zoom, bh = 16 / zoom
        ctx.fillStyle = 'rgba(108,99,255,0.85)'
        ctx.beginPath(); ctx.roundRect(cx - bw / 2, y + h + 16 / zoom, bw, bh, 3 / zoom); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(`${worldToCm(w)}×${worldToCm(h)}cm`, cx, y + h + 27 / zoom)
      }
    })

    // ── Walls ────────────────────────────────────────────────────────
    walls.forEach(wall => {
      const sel = selectedWall === wall.id
      const ddx = wall.end.x - wall.start.x, ddy = wall.end.y - wall.start.y
      const wlen = Math.sqrt(ddx * ddx + ddy * ddy); if (!wlen) return
      const nnx = -ddy / wlen * WALL_HALF_THICKNESS_WORLD, nny = ddx / wlen * WALL_HALF_THICKNESS_WORLD

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(wall.start.x + nnx, wall.start.y + nny)
      ctx.lineTo(wall.end.x + nnx, wall.end.y + nny)
      ctx.lineTo(wall.end.x - nnx, wall.end.y - nny)
      ctx.lineTo(wall.start.x - nnx, wall.start.y - nny)
      ctx.closePath()
      if (wallTex && loadedImages[wallTex.id]) {
        ctx.fillStyle = ctx.createPattern(loadedImages[wallTex.id], 'repeat')
      } else {
        ctx.fillStyle = wallColor
      }
      ctx.fill()
      ctx.restore()

      ctx.strokeStyle = sel ? '#6c63ff' : wallColor
      ctx.lineWidth = sel ? WALL_THICKNESS_WORLD + 2 : WALL_THICKNESS_WORLD; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(wall.start.x, wall.start.y); ctx.lineTo(wall.end.x, wall.end.y); ctx.stroke()
      ctx.fillStyle = '#43d9ad'
      ;[wall.start, wall.end].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill() })

      const dx2 = wall.end.x - wall.start.x, dy2 = wall.end.y - wall.start.y
      const wlen2 = worldToCm(Math.sqrt(dx2 * dx2 + dy2 * dy2))
      const midX = (wall.start.x + wall.end.x) / 2, midY = (wall.start.y + wall.end.y) / 2
      ctx.fillStyle = 'rgba(108,99,255,0.85)'; ctx.beginPath(); ctx.roundRect(midX - 24, midY - 20, 48, 16, 3); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px DM Sans,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${wlen2} cm`, midX, midY - 8)
    })

    // ── Openings ─────────────────────────────────────────────────────
    const roomCenter = (() => {
      if (floorRect && floorRect.w > 0 && floorRect.h > 0)
        return { x: floorRect.x + floorRect.w / 2, y: floorRect.y + floorRect.h / 2 }
      if (!walls.length) return null
      const xs = walls.flatMap(w => [w.start.x, w.end.x])
      const ys = walls.flatMap(w => [w.start.y, w.end.y])
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
    })()

    openings.forEach(op => {
      const wall = walls.find(w => w.id === op.wallId); if (!wall) return
      const ddx = wall.end.x - wall.start.x, ddy = wall.end.y - wall.start.y
      const wlen = Math.sqrt(ddx * ddx + ddy * ddy)
      const ux = ddx / wlen, uy = ddy / wlen
      const nx = -uy, ny = ux
      const openingWidthCm = normalizeOpeningWidthCm(op.width, op.type === 'door' ? 90 : 120)
      const openingWidth = cmToWorld(openingWidthCm)
      const W2 = openingWidth / 2
      const ocx = wall.start.x + ddx * op.t
      const ocy = wall.start.y + ddy * op.t
      const inwardSign = roomCenter && (((roomCenter.x - ocx) * nx + (roomCenter.y - ocy) * ny) < 0) ? -1 : 1
      const swingSign = op.openTo === 'outside' ? -inwardSign : inwardSign
      const hinge = op.hinge === 'right' ? 'right' : 'left'
      const isSel = selectedOpening === op.id

      // Clear gap
      ctx.save()
      ctx.strokeStyle = floorColor || '#f5f2ee'; ctx.lineWidth = WALL_THICKNESS_WORLD + 2; ctx.lineCap = 'butt'
      ctx.beginPath(); ctx.moveTo(ocx - ux * W2, ocy - uy * W2); ctx.lineTo(ocx + ux * W2, ocy + uy * W2); ctx.stroke()
      ctx.restore()

      if (op.type === 'door') {
        const design = op.design || 'single'
        const doorStroke = isSel ? '#6c63ff' : '#2d6a4f'
        const swingColor = isSel ? 'rgba(108,99,255,0.98)' : 'rgba(29,126,93,0.98)'

        if (design === 'double') {
          const hx = ux * W2 * 0.5, hy = uy * W2 * 0.5
          ctx.strokeStyle = doorStroke; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(ocx - ux * W2, ocy - uy * W2); ctx.lineTo(ocx - hx, ocy - hy)
          ctx.moveTo(ocx + hx, ocy + hy); ctx.lineTo(ocx + ux * W2, ocy + uy * W2)
          ctx.stroke()
          const wallAngle = Math.atan2(uy, ux)
          ctx.strokeStyle = swingColor; ctx.lineWidth = 2; ctx.setLineDash([7, 4])
          ctx.beginPath(); ctx.arc(ocx - ux * W2, ocy - uy * W2, W2, wallAngle, wallAngle + swingSign * Math.PI / 2, swingSign < 0); ctx.stroke()
          ctx.beginPath(); ctx.arc(ocx + ux * W2, ocy + uy * W2, W2, wallAngle + Math.PI, wallAngle + Math.PI - swingSign * Math.PI / 2, swingSign > 0); ctx.stroke()
          ctx.setLineDash([])
        } else if (design === 'sliding') {
          ctx.strokeStyle = doorStroke; ctx.lineWidth = 2
          ;[-1, 1].forEach(side => {
            ctx.beginPath()
            ctx.moveTo(ocx - ux * W2 + nx * 4 * side, ocy - uy * W2 + ny * 4 * side)
            ctx.lineTo(ocx + ux * W2 + nx * 4 * side, ocy + uy * W2 + ny * 4 * side)
            ctx.stroke()
          })
        } else {
          ctx.strokeStyle = doorStroke; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(ocx - ux * W2, ocy - uy * W2); ctx.lineTo(ocx + ux * W2, ocy + uy * W2); ctx.stroke()
          const wallAngle = Math.atan2(uy, ux)
          const hingeX = hinge === 'left' ? ocx - ux * W2 : ocx + ux * W2
          const hingeY = hinge === 'left' ? ocy - uy * W2 : ocy + uy * W2
          const startAngle = hinge === 'left' ? wallAngle : wallAngle + Math.PI
          const endAngle = startAngle + swingSign * Math.PI / 2
          ctx.strokeStyle = swingColor; ctx.lineWidth = 2; ctx.setLineDash([7, 4])
          ctx.beginPath(); ctx.arc(hingeX, hingeY, openingWidth, startAngle, endAngle, swingSign < 0); ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.fillStyle = isSel ? '#6c63ff' : '#2d6a4f'
        ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(design === 'double' ? 'D-Double' : design === 'sliding' ? 'D-Slide' : 'Door', ocx + ny * 18, ocy + ny * 18)
      } else {
        const design = op.design || 'casement'
        const winStroke = isSel ? '#6c63ff' : '#1a7abf'
        const wh2 = Math.max(6, WALL_HALF_THICKNESS_WORLD)
        ctx.save()
        ctx.fillStyle = 'rgba(173,216,230,0.55)'
        ctx.beginPath()
        ctx.moveTo(ocx - ux * W2 + nx * wh2, ocy - uy * W2 + ny * wh2)
        ctx.lineTo(ocx + ux * W2 + nx * wh2, ocy + uy * W2 + ny * wh2)
        ctx.lineTo(ocx + ux * W2 - nx * wh2, ocy + uy * W2 - ny * wh2)
        ctx.lineTo(ocx - ux * W2 - nx * wh2, ocy - uy * W2 - ny * wh2)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = winStroke; ctx.lineWidth = 2; ctx.lineCap = 'square'
        ;[-1, 1].forEach(side => {
          ctx.beginPath()
          ctx.moveTo(ocx - ux * W2 + nx * wh2 * side, ocy - uy * W2 + ny * wh2 * side)
          ctx.lineTo(ocx + ux * W2 + nx * wh2 * side, ocy + uy * W2 + ny * wh2 * side)
          ctx.stroke()
        })
        if (design === 'bay') {
          ctx.beginPath()
          ctx.moveTo(ocx - ux * W2, ocy - uy * W2); ctx.lineTo(ocx - ux * W2 + nx * 7, ocy - uy * W2 + ny * 7)
          ctx.moveTo(ocx + ux * W2, ocy + uy * W2); ctx.lineTo(ocx + ux * W2 + nx * 7, ocy + uy * W2 + ny * 7)
          ctx.stroke()
        } else if (design !== 'sliding') {
          ctx.beginPath(); ctx.moveTo(ocx + nx * wh2, ocy + ny * wh2); ctx.lineTo(ocx - nx * wh2, ocy - ny * wh2); ctx.stroke()
        }
        ctx.restore()
        ctx.fillStyle = winStroke; ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(design === 'sliding' ? 'W-Slide' : design === 'bay' ? 'W-Bay' : 'Win', ocx + ny * 20, ocy + ny * 20)
      }

      if (isSel) {
        ctx.beginPath(); ctx.arc(ocx, ocy, 5 / zoom, 0, Math.PI * 2); ctx.fillStyle = '#6c63ff'; ctx.fill()
      }
    })

    // Wall preview
    if (drawStart && activeTool === 'wall') {
      const ex = snap(mousePos.x), ey = snap(mousePos.y)
      ctx.strokeStyle = 'rgba(108,99,255,0.55)'; ctx.lineWidth = 6; ctx.setLineDash([8, 4])
      ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([])
      const pdx = ex - drawStart.x, pdy = ey - drawStart.y
      const plen = worldToCm(Math.sqrt(pdx * pdx + pdy * pdy))
      const pmx = (drawStart.x + ex) / 2, pmy = (drawStart.y + ey) / 2
      ctx.fillStyle = 'rgba(108,99,255,0.9)'; ctx.beginPath(); ctx.roundRect(pmx - 28, pmy - 21, 56, 17, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${plen} cm`, pmx, pmy - 8)
    }

    // Floor preview
    if (drawStart && activeTool === 'floor') {
      const ex = snap(mousePos.x), ey = snap(mousePos.y)
      const fx = Math.min(drawStart.x, ex), fy = Math.min(drawStart.y, ey)
      const fw = Math.abs(ex - drawStart.x), fh = Math.abs(ey - drawStart.y)
      ctx.fillStyle = 'rgba(67,217,173,0.16)'; ctx.fillRect(fx, fy, fw, fh)
      ctx.strokeStyle = 'rgba(67,217,173,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([8, 4])
      ctx.strokeRect(fx, fy, fw, fh); ctx.setLineDash([])
    }

    // Crosshair
    if (activeTool === 'wall' || activeTool === 'floor') {
      const sx = snap(mousePos.x), sy = snap(mousePos.y)
      ctx.strokeStyle = activeTool === 'floor' ? 'rgba(67,217,173,0.75)' : 'rgba(108,99,255,0.6)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10); ctx.stroke()
      ctx.fillStyle = activeTool === 'floor' ? '#43d9ad' : '#6c63ff'
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore() // end world clip
  }, [walls, drawStart, mousePos, showGrid, bgImage, bgOpacity, placed, openings,
      selectedWall, selectedItem, selectedOpening, activeTool, floorTex, floorRect,
      floorColor, wallTex, wallColor, loadedImages, zoom, pan, canvasViewport])

  // ── Coordinate helpers ───────────────────────────────────────────────
  const screenToWorld = useCallback((clientX, clientY) => {
    const r = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - r.left - panRef.current.x) / zoomRef.current,
      y: (clientY - r.top  - panRef.current.y) / zoomRef.current,
    }
  }, [])

  const getPos = (e) => {
    const w = screenToWorld(e.clientX, e.clientY)
    return { x: snap(w.x), y: snap(w.y) }
  }

  // ── Mouse down ───────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      isPanning.current = true
      panStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y }
      return
    }
    if (e.button !== 0) return

    const world = screenToWorld(e.clientX, e.clientY)
    const mx = world.x, my = world.y

    if (activeTool === 'select') {
      const sel = selectedRef.current
      const items = placedRef.current

      if (sel !== null) {
        const item = items.find(p => p.id === sel)
        if (item) {
          const handle = hitHandle(mx, my, item, zoomRef.current)
          if (handle) {
            e.preventDefault()
            dragState.current = { type: handle === 'rot' ? 'rotate' : `resize-${handle}`, startMx: mx, startMy: my, origItem: { ...item } }
            return
          }
          if (hitItem(mx, my, item)) {
            e.preventDefault()
            dragState.current = { type: 'move', startMx: mx, startMy: my, origItem: { ...item } }
            return
          }
        }
      }

      const hit = [...items].reverse().find(p => hitItem(mx, my, p))
      if (hit) {
        setSelectedItem(hit.id); setSelectedWall(null)
        dragState.current = { type: 'move', startMx: mx, startMy: my, origItem: { ...hit } }
        return
      }

      const hitOpening = openingsRef.current.find(op => {
        const wall = walls.find(w => w.id === op.wallId); if (!wall) return false
        const dx2 = wall.end.x - wall.start.x, dy2 = wall.end.y - wall.start.y
        const ocx = wall.start.x + dx2 * op.t, ocy = wall.start.y + dy2 * op.t
        return Math.sqrt((mx - ocx) ** 2 + (my - ocy) ** 2) < 20
      })
      if (hitOpening) {
        setSelectedOpening(hitOpening.id); setSelectedItem(null); setSelectedWall(null)
        dragState.current = { type: 'move-opening', startMx: mx, startMy: my, origOpening: { ...hitOpening } }
        return
      }

      const hitWall = walls.find(w => {
        const dx2 = w.end.x - w.start.x, dy2 = w.end.y - w.start.y
        const wlen = Math.sqrt(dx2 * dx2 + dy2 * dy2); if (!wlen) return false
        const t = Math.max(0, Math.min(1, ((mx - w.start.x) * dx2 + (my - w.start.y) * dy2) / (wlen * wlen)))
        const ex = w.start.x + t * dx2 - mx, ey = w.start.y + t * dy2 - my
        return Math.sqrt(ex * ex + ey * ey) < 10
      })
      setSelectedWall(hitWall?.id ?? null); setSelectedItem(null); setSelectedOpening(null)
    }

    if (activeTool === 'wall') {
      const pos = getPos(e)
      if (!drawStart) { setDrawStart(pos) }
      else {
        pushHistory([...wallsRef.current, { id: Date.now(), start: drawStart, end: pos }], placedRef.current, openingsRef.current)
        setDrawStart(pos)
      }
    }

    if (activeTool === 'floor') {
      setDrawStart(getPos(e)); setSelectedWall(null); setSelectedItem(null); setSelectedOpening(null)
    }

    if (activeTool === 'door' || activeTool === 'window') {
      const nearest = getNearestWallPoint(mx, my, walls, 30)
      if (nearest?.wall) {
        const selectedDesign = openingDesigns?.[activeTool]
        const preset = OPENING_PRESETS[activeTool]?.[selectedDesign]
        const newOpening = {
          id: `op_${Date.now()}`, wallId: nearest.wall.id, t: nearest.t, type: activeTool,
          design: preset ? selectedDesign : (activeTool === 'door' ? 'single' : 'casement'),
          width: preset?.width || (activeTool === 'door' ? 90 : 120),
          ...(activeTool === 'door' ? { openTo: 'inside', hinge: 'left' } : {}),
        }
        pushHistory(wallsRef.current, placedRef.current, [...openingsRef.current, newOpening])
        setSelectedOpening(newOpening.id); setSelectedItem(null); setSelectedWall(null)
      }
    }
  }, [activeTool, walls, drawStart, pushHistory, screenToWorld, openingDesigns])

  // ── Mouse move ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const rawX = e.clientX - r.left, rawY = e.clientY - r.top

    setMousePos(prev => {
      const nextX = (rawX - panRef.current.x) / zoomRef.current
      const nextY = (rawY - panRef.current.y) / zoomRef.current
      if (Math.abs(prev.x - nextX) < 0.25 && Math.abs(prev.y - nextY) < 0.25) return prev
      return { x: nextX, y: nextY }
    })

    if (isPanning.current) {
      const rawPx = e.clientX - panStart.current.x
      const rawPy = e.clientY - panStart.current.y
      const vp = viewportRef.current
      const clamped = clampPan(rawPx, rawPy, zoomRef.current, vp.width || 900, vp.height || 550)
      setPan(prev => (prev.x === clamped.x && prev.y === clamped.y ? prev : clamped))
      return
    }

    const ds = dragState.current
    if (!ds) return

    const world = screenToWorld(e.clientX, e.clientY)
    const mx = world.x, my = world.y
    const { origItem } = ds
    const dx = mx - ds.startMx, dy = my - ds.startMy

    if (ds.type === 'move') {
      const nextX = snap(origItem.x + dx), nextY = snap(origItem.y + dy)
      setPlaced(prev => {
        let changed = false
        const next = prev.map(p => { if (p.id !== origItem.id || (p.x === nextX && p.y === nextY)) return p; changed = true; return { ...p, x: nextX, y: nextY } })
        if (changed) { placedRef.current = next; window.__editorPlaced = next; window.dispatchEvent(new Event('editor-state-change')) }
        return changed ? next : prev
      })
    } else if (ds.type === 'move-opening') {
      const nearest = getNearestWallPoint(mx, my, wallsRef.current, 50)
      if (!nearest?.wall) return
      setOpenings(prev => {
        let changed = false
        const next = prev.map(o => { if (o.id !== ds.origOpening.id || (o.wallId === nearest.wall.id && o.t === nearest.t)) return o; changed = true; return { ...o, wallId: nearest.wall.id, t: nearest.t } })
        if (!changed) return prev
        openingsRef.current = next; window.__editorOpenings = next; window.dispatchEvent(new Event('editor-state-change'))
        return next
      })
    } else if (ds.type === 'rotate') {
      const rcx = origItem.x + origItem.w / 2, rcy = origItem.y + origItem.h / 2
      const angle = Math.atan2(my - rcy, mx - rcx) + Math.PI / 2
      setPlaced(prev => {
        let changed = false
        const next = prev.map(p => { if (p.id !== origItem.id || (p.angle || 0) === angle) return p; changed = true; return { ...p, angle } })
        if (changed) { placedRef.current = next; window.__editorPlaced = next; window.dispatchEvent(new Event('editor-state-change')) }
        return changed ? next : prev
      })
    } else if (ds.type.startsWith('resize-')) {
      const corner = ds.type.replace('resize-', '')
      const { x, y, w, h, angle: a = 0 } = origItem
      const cos = Math.cos(-a), sin = Math.sin(-a)
      const ldx = dx * cos - dy * sin, ldy = dx * sin + dy * cos
      let nx = x, ny = y, nw = w, nh = h
      if (corner === 'br') { nw = Math.max(GRID, snap(w + ldx)); nh = Math.max(GRID, snap(h + ldy)) }
      if (corner === 'bl') { nx = snap(x + (w - Math.max(GRID, snap(w - ldx)))); nw = Math.max(GRID, snap(w - ldx)); nh = Math.max(GRID, snap(h + ldy)) }
      if (corner === 'tr') { nw = Math.max(GRID, snap(w + ldx)); ny = snap(y + (h - Math.max(GRID, snap(h - ldy)))); nh = Math.max(GRID, snap(h - ldy)) }
      if (corner === 'tl') {
        nx = snap(x + (w - Math.max(GRID, snap(w - ldx)))); nw = Math.max(GRID, snap(w - ldx))
        ny = snap(y + (h - Math.max(GRID, snap(h - ldy)))); nh = Math.max(GRID, snap(h - ldy))
      }
      setPlaced(prev => {
        let changed = false
        const next = prev.map(p => { if (p.id !== origItem.id || (p.x === nx && p.y === ny && p.w === nw && p.h === nh)) return p; changed = true; return { ...p, x: nx, y: ny, w: nw, h: nh } })
        if (changed) { placedRef.current = next; window.__editorPlaced = next; window.dispatchEvent(new Event('editor-state-change')) }
        return changed ? next : prev
      })
    }

    const canvas = canvasRef.current
    if (ds.type === 'move' || ds.type === 'move-opening') canvas.style.cursor = 'grabbing'
    else if (ds.type === 'rotate') canvas.style.cursor = 'crosshair'
    else canvas.style.cursor = 'nwse-resize'
  }, [screenToWorld])

  useEffect(() => {
    return () => { if (moveRafRef.current) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = null } }
  }, [])

  // ── Mouse up ─────────────────────────────────────────────────────────
  const handleMouseUp = useCallback((e) => {
    if (e.button === 1 || e.button === 2) { isPanning.current = false; return }

    if (e.button === 0 && activeTool === 'floor' && drawStart) {
      const world = screenToWorld(e.clientX, e.clientY)
      const ex = snap(world.x), ey = snap(world.y)
      const x = Math.min(drawStart.x, ex), y = Math.min(drawStart.y, ey)
      const w = Math.abs(ex - drawStart.x), h = Math.abs(ey - drawStart.y)
      if (w >= GRID && h >= GRID) setFloorRect({ x, y, w, h })
      setDrawStart(null)
      if (canvasRef.current) canvasRef.current.style.cursor = ''
      return
    }

    if (dragState.current) {
      const orig = dragState.current.origItem
      if (orig) {
        redoStack.current = []
        undoStack.current.push({ walls: wallsRef.current.map(w => ({ ...w })), placed: placedRef.current.map(p => p.id === orig.id ? { ...orig } : { ...p }), openings: openingsRef.current.map(o => ({ ...o })) })
      }
      const origOpening = dragState.current.origOpening
      if (origOpening) {
        redoStack.current = []
        undoStack.current.push({ walls: wallsRef.current.map(w => ({ ...w })), placed: placedRef.current.map(p => ({ ...p })), openings: openingsRef.current.map(o => o.id === origOpening.id ? { ...origOpening } : { ...o }) })
      }
    }
    dragState.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = ''
  }, [activeTool, drawStart, screenToWorld])

  const handleDblClick   = () => setDrawStart(null)
  const handleRightClick = (e) => { e.preventDefault(); if (!isPanning.current) setDrawStart(null) }

  useEffect(() => {
    const selOpData = openings.find(o => o.id === selectedOpening)
    const next = selectedWall
      ? { kind: 'wall', id: selectedWall, label: 'Wall' }
      : selOpData ? { kind: selOpData.type === 'door' ? 'door' : 'window', id: selOpData.id, label: selOpData.type === 'door' ? 'Door' : 'Window' } : null
    window.__editorSelection = next
    window.dispatchEvent(new CustomEvent('editor-selection-change', { detail: next }))
  }, [selectedWall, selectedOpening, openings])

  useEffect(() => {
    window.__editorDeleteSelection = () => { if (deleteSelectedWall()) return true; if (deleteSelectedOpening()) return true; return false }
    return () => { delete window.__editorDeleteSelection; delete window.__editorSelection; window.dispatchEvent(new CustomEvent('editor-selection-change', { detail: null })) }
  }, [deleteSelectedWall, deleteSelectedOpening])

  useEffect(() => {
    const onOutside = (e) => { if (!rootRef.current || rootRef.current.contains(e.target)) return; setSelectedItem(null); setSelectedWall(null); setSelectedOpening(null) }
    window.addEventListener('pointerdown', onOutside)
    return () => window.removeEventListener('pointerdown', onOutside)
  }, [])

  const rotateSelected = (delta) => {
    if (!selectedItem) return
    setPlaced(prev => prev.map(p => p.id === selectedItem ? { ...p, angle: (p.angle || 0) + delta } : p))
  }

  const updateSelectedColor = (color) => {
    if (!selectedItem || !color) return
    setPlaced(prev => {
      let changed = false
      const next = prev.map(p => { if (p.id !== selectedItem || p.color === color) return p; changed = true; return { ...p, color } })
      if (changed) { placedRef.current = next; window.__editorPlaced = next; window.dispatchEvent(new Event('editor-state-change')) }
      return changed ? next : prev
    })
  }

  const deleteSelected = () => {
    if (!selectedItem) return
    pushHistory(wallsRef.current, placedRef.current.filter(p => p.id !== selectedItem), openingsRef.current)
    setSelectedItem(null)
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const r = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - r.left, mouseY = e.clientY - r.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(zoomRef.current * factor, 0.15), 5)
    const rawPx = mouseX - (mouseX - panRef.current.x) * (newZoom / zoomRef.current)
    const rawPy = mouseY - (mouseY - panRef.current.y) * (newZoom / zoomRef.current)
    const vp = viewportRef.current
    const clamped = clampPan(rawPx, rawPy, newZoom, vp.width || 900, vp.height || 550)
    setPan(clamped); panRef.current = clamped
    window.__setEditorZoom && window.__setEditorZoom(newZoom)
  }, [])

  const handleMouseMoveForCursor = useCallback((e) => {
    if (dragState.current) return
    const canvas = canvasRef.current; if (!canvas) return
    if (isPanning.current) { canvas.style.cursor = 'grabbing'; return }
    if (activeTool === 'wall' || activeTool === 'floor') { canvas.style.cursor = 'crosshair'; return }
    if (activeTool === 'door' || activeTool === 'window') {
      const world = screenToWorld(e.clientX, e.clientY)
      canvas.style.cursor = getNearestWallPoint(world.x, world.y, wallsRef.current, 30) ? 'copy' : 'no-drop'
      return
    }
    if (activeTool !== 'select') return
    const world = screenToWorld(e.clientX, e.clientY)
    if (selectedRef.current !== null) {
      const item = placedRef.current.find(p => p.id === selectedRef.current)
      if (item) {
        const handle = hitHandle(world.x, world.y, item, zoomRef.current)
        if (handle === 'rot') { canvas.style.cursor = 'grab'; return }
        if (handle) { canvas.style.cursor = 'nwse-resize'; return }
        if (hitItem(world.x, world.y, item)) { canvas.style.cursor = 'move'; return }
      }
    }
    if (placedRef.current.find(p => hitItem(world.x, world.y, p))) { canvas.style.cursor = 'move'; return }
    const hitOp = openingsRef.current.find(op => {
      const wall = wallsRef.current.find(w => w.id === op.wallId); if (!wall) return false
      const dx2 = wall.end.x - wall.start.x, dy2 = wall.end.y - wall.start.y
      const ocx = wall.start.x + dx2 * op.t, ocy = wall.start.y + dy2 * op.t
      return Math.sqrt((world.x - ocx) ** 2 + (world.y - ocy) ** 2) < 18
    })
    canvas.style.cursor = hitOp ? 'move' : ''
  }, [activeTool, screenToWorld])

  const onMouseMove = useCallback((e) => {
    queuedPointerRef.current = { clientX: e.clientX, clientY: e.clientY, button: e.button }
    if (moveRafRef.current) return
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = null
      const q = queuedPointerRef.current; if (!q) return
      handleMouseMove(q); handleMouseMoveForCursor(q)
    })
  }, [handleMouseMove, handleMouseMoveForCursor])

  const handleDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('furniture'); if (!raw) return
    const item = JSON.parse(raw)
    const r = canvasRef.current.getBoundingClientRect()
    const defaults = getDefaultFurnitureSizeCm(item.cat || item.category || item.name)
    const sourceW = normalizeFurnitureSizeCm(item.w ?? item.width, defaults.width)
    const sourceD = normalizeFurnitureSizeCm(item.d ?? item.depth, defaults.depth)
    const iw = Math.max(GRID, snap(cmToWorld(sourceW))), id2 = Math.max(GRID, snap(cmToWorld(sourceD)))
    const x = snap((e.clientX - r.left - panRef.current.x) / zoomRef.current - iw / 2)
    const y = snap((e.clientY - r.top  - panRef.current.y) / zoomRef.current - id2 / 2)
    const newItem = { ...item, id: `pf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, x, y, w: iw, h: id2, angle: 0, color: item.color || '#8b6b4a', model3d: item.model3d || null }
    undoStack.current.push({ walls: wallsRef.current.map(w => ({ ...w })), placed: placedRef.current.map(p => ({ ...p })), openings: openingsRef.current.map(o => ({ ...o })) })
    redoStack.current = []
    const next = [...placedRef.current, newItem]
    placedRef.current = next; setPlaced(next); window.__editorPlaced = next
    setSelectedItem(newItem.id)
    const img = new Image(); img.src = item.image
    img.onload = () => setLoadedImages(prev => ({ ...prev, [newItem.id]: img }))
  }

  const handleBlueprintUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const img = new Image(); img.onload = () => setBgImage(img); img.src = ev.target.result }
    reader.readAsDataURL(file); e.target.value = ''
  }

  const selItem    = placed.find(p => p.id === selectedItem)
  const selOpening = openings.find(o => o.id === selectedOpening)

  const updateSelectedDoorOption = (field, value) => {
    if (!selectedOpening) return
    const cur = openingsRef.current.find(o => o.id === selectedOpening)
    if (!cur || cur.type !== 'door' || cur[field] === value) return
    pushHistory(wallsRef.current, placedRef.current, openingsRef.current.map(o => o.id === selectedOpening ? { ...o, [field]: value } : o))
  }

  return (
    <div className="canvas2d-root" ref={rootRef}>
      <div className="canvas2d-main">

        {/* Toolbar */}
        <div className="canvas2d-toolbar">
          {bgImage && (
            <>
              <input type="range" min="0.05" max="1" step="0.05" value={bgOpacity}
                onChange={e => setBgOpacity(Number(e.target.value))} className="canvas2d-toolbar__bg-range" />
              <button className="canvas2d-toolbar__btn--danger" onClick={() => setBgImage(null)}>✕ BG</button>
            </>
          )}
          <button className={`canvas2d-toolbar__btn canvas2d-toolbar__btn--textures${texPanel ? ' canvas2d-toolbar__btn--active' : ''}`}
            onClick={() => setTexPanel(!texPanel)}>
            <span className="canvas2d-toolbar__btn-label">Textures</span>
            <span className="canvas2d-toolbar__btn-caret" aria-hidden="true">
              <ChevronDown className={`canvas2d-toolbar__btn-caret-icon${texPanel ? ' canvas2d-toolbar__btn-caret-icon--open' : ''}`} size={14} strokeWidth={2.5} />
            </span>
          </button>

          {selItem && (
            <div className="canvas2d-toolbar__actions canvas2d-toolbar__actions--item">
              <div className="canvas2d-toolbar__item-meta">
                <span className="canvas2d-toolbar__item-name">{selItem.name}</span>
                <span className="canvas2d-toolbar__item-size">{worldToCm(selItem.w)}×{worldToCm(selItem.h)} cm</span>
              </div>
              <label className="canvas2d-toolbar__color-control" aria-label="Furniture color">
                <span className="canvas2d-toolbar__color-label">Color</span>
                <span className="canvas2d-toolbar__color-preview" style={{ background: selItem.color || '#8b6b4a' }} aria-hidden="true" />
                <input type="color" value={selItem.color || '#8b6b4a'} onChange={e => updateSelectedColor(e.target.value)} className="canvas2d-toolbar__color-input" />
              </label>
              <div className="canvas2d-toolbar__item-actions">
                <button onClick={() => rotateSelected(-Math.PI / 2)} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--purple">↺ 90°</button>
                <button onClick={() => rotateSelected(Math.PI / 2)}  className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--purple">↻ 90°</button>
                <button onClick={deleteSelected} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--red">🗑 Delete</button>
              </div>
            </div>
          )}

          {selectedWall && !selItem && (
            <div className="canvas2d-toolbar__actions canvas2d-toolbar__actions--selection">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--selection">Wall selected</span>
              <button onClick={deleteSelectedWall} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--red canvas2d-toolbar__action-btn--selection-delete">🗑 Delete</button>
            </div>
          )}

          {selectedOpening && !selItem && !selectedWall && (
            <div className={`canvas2d-toolbar__actions canvas2d-toolbar__actions--selection${selOpening?.type === 'door' ? ' canvas2d-toolbar__actions--door' : ''}`}>
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--selection">
                {selOpening?.type === 'door' ? 'Door selected' : 'Window selected'}
              </span>
              {selOpening?.type === 'door' && (
                <>
                  <div className="canvas2d-toolbar__door-group">
                    <span className="canvas2d-toolbar__door-label">Swing</span>
                    <div className="canvas2d-toolbar__door-toggle" role="group">
                      <button type="button" className={`canvas2d-toolbar__door-btn${(selOpening.openTo || 'inside') === 'inside' ? ' canvas2d-toolbar__door-btn--active' : ''}`} onClick={() => updateSelectedDoorOption('openTo', 'inside')}>Inside</button>
                      <button type="button" className={`canvas2d-toolbar__door-btn${selOpening.openTo === 'outside' ? ' canvas2d-toolbar__door-btn--active' : ''}`} onClick={() => updateSelectedDoorOption('openTo', 'outside')}>Outside</button>
                    </div>
                  </div>
                  {selOpening.design !== 'sliding' && (
                    <div className="canvas2d-toolbar__door-group">
                      <span className="canvas2d-toolbar__door-label">Hinge</span>
                      <div className="canvas2d-toolbar__door-toggle" role="group">
                        <button type="button" className={`canvas2d-toolbar__door-btn${(selOpening.hinge || 'left') === 'left' ? ' canvas2d-toolbar__door-btn--active' : ''}`} onClick={() => updateSelectedDoorOption('hinge', 'left')}>Left</button>
                        <button type="button" className={`canvas2d-toolbar__door-btn${selOpening.hinge === 'right' ? ' canvas2d-toolbar__door-btn--active' : ''}`} onClick={() => updateSelectedDoorOption('hinge', 'right')}>Right</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              <button onClick={deleteSelectedOpening} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--red canvas2d-toolbar__action-btn--selection-delete">🗑 Delete</button>
            </div>
          )}

          {activeTool === 'floor' && !selItem && !selectedWall && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--teal">▭ Click and drag to draw floor area</span>
            </div>
          )}

          {!selItem && !selectedWall && !selectedOpening && activeTool !== 'floor' && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--dim">
                {activeTool === 'wall'
                  ? '✏ Click to draw walls · Double-click to finish'
                  : '↖ Select · Drag to move · Corner handles to resize · ↻ rotate · Right-drag to pan'}
              </span>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBlueprintUpload} />
        </div>

        {/* Texture panel */}
        {texPanel && (
          <div className="canvas2d-tex-panel">
            <div className="canvas2d-tex-panel__section">
              <div className="canvas2d-tex-section__header"><div className="canvas2d-tex-section__label">Wall Surface</div></div>
              <div className="canvas2d-tex-section__swatches">
                {['#e8e2d8','#2d2a4a','#1a3a4a','#4a2a1a','#1a4a2a','#3a1a4a','#4a3a1a','#1a1a1a','#f5f0e8','#c8b89a'].map(col => (
                  <div key={col} onClick={() => { setWallColor(col); setWallTex(null) }}
                    className={`canvas2d-color-swatch${wallColor === col && !wallTex ? ' canvas2d-color-swatch--active' : ''}`}
                    style={{ background: col }} />
                ))}
                <div className="canvas2d-color-picker-wrap">
                  <div className="canvas2d-color-picker-icon" style={{ background: wallColor }}>🖊</div>
                  <input type="color" value={wallColor} onChange={e => { setWallColor(e.target.value); setWallTex(null) }} className="canvas2d-color-picker-input" />
                </div>
              </div>
            </div>
            <div className="canvas2d-tex-panel__section">
              <div className="canvas2d-tex-section__header"><div className="canvas2d-tex-section__label">Floor Surface</div></div>
              <div className="canvas2d-tex-section__swatches">
                {['#f5f2ee','#d7c8aa','#bfa58b','#9b8a72','#7f6c58','#5e5246','#2c2c32','#e8efe6','#c4d0b8','#bcd2e5'].map(col => (
                  <div key={col} onClick={() => { setFloorColor(col); setFloorTex(null) }}
                    className={`canvas2d-color-swatch${floorColor === col && !floorTex ? ' canvas2d-color-swatch--active' : ''}`}
                    style={{ background: col }} />
                ))}
                <div className="canvas2d-color-picker-wrap">
                  <div className="canvas2d-color-picker-icon" style={{ background: floorColor }}>🖊</div>
                  <input type="color" value={floorColor} onChange={e => { setFloorColor(e.target.value); setFloorTex(null) }} className="canvas2d-color-picker-input" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          className={`canvas2d-canvas canvas2d-canvas--${activeTool === 'wall' || activeTool === 'floor' ? 'wall' : (activeTool === 'door' || activeTool === 'window' ? 'opening' : 'default')}`}
          onMouseMove={onMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
          onContextMenu={handleRightClick}
          onWheel={handleWheel}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        />
      </div>
    </div>
  )
}