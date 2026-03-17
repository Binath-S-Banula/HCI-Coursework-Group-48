import { useRef, useEffect, useState, useCallback } from 'react'
import '../../styles/editor/Canvas2D.css'
import { useSelector } from 'react-redux'

const GRID = 20
const snap = (v) => Math.round(v / GRID) * GRID
const HANDLE_R = 6   // corner handle radius (world px)
const ROT_OFFSET = 28 // rotate handle distance above item

const getAdminAssets = () => JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[],"textures":[]}')

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
  // Transform mouse into item-local space
  const { x, y, w, h, angle = 0 } = item
  const cx = x + w / 2, cy = y + h / 2
  const cos = Math.cos(-angle), sin = Math.sin(-angle)
  const dx = mx - cx, dy = my - cy
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return lx >= -w / 2 && lx <= w / 2 && ly >= -h / 2 && ly <= h / 2
}

export default function Canvas2D({ onDesignChange }) {
  const canvasRef  = useRef(null)
  const fileRef    = useRef(null)
  const { activeTool, showGrid, zoom } = useSelector((s) => s.editor)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning  = useRef(false)
  const panStart   = useRef({ x: 0, y: 0 })

  const [assets,       setAssets]       = useState(getAdminAssets)
  const [walls,        setWalls]        = useState(() => window.__editorWalls    || [])
  const [drawStart,    setDrawStart]    = useState(null)
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 })
  const [placed,       setPlaced]       = useState(() => window.__editorPlaced   || [])
  const [openings,     setOpenings]     = useState(() => window.__editorOpenings || [])
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedWall, setSelectedWall] = useState(null)
  const [selectedOpening, setSelectedOpening] = useState(null)
  const [bgImage,      setBgImage]      = useState(null)
  const [bgOpacity,    setBgOpacity]    = useState(0.3)
  const [floorTex,     setFloorTex]     = useState(() => window.__editorFloorTex || null)
  const [floorRect,    setFloorRect]    = useState(() => window.__editorFloor || null)
  const [floorColor,   setFloorColor]   = useState(() => window.__editorFloorColor || '#f5f2ee')
  const [wallTex,      setWallTex]      = useState(() => window.__editorWallTex  || null)
  const [wallColor,    setWallColor]    = useState(() => window.__editorWallColor || '#e8e2d8')
  const [texPanel,     setTexPanel]     = useState(false)
  const [loadedImages, setLoadedImages] = useState({})

  // Interaction state refs (avoid stale closures in event listeners)
  const dragState  = useRef(null)  // { type: 'move'|'resize-tl'|…|'rotate', startMx, startMy, origItem }
  const wallsRef    = useRef(walls)
  useEffect(() => { wallsRef.current = walls }, [walls])
  const placedRef   = useRef(placed)
  useEffect(() => { placedRef.current = placed }, [placed])
  const openingsRef = useRef(openings)
  useEffect(() => { openingsRef.current = openings }, [openings])
  const selectedRef = useRef(selectedItem)
  useEffect(() => { selectedRef.current = selectedItem }, [selectedItem])
  const panRef = useRef(pan)
  useEffect(() => { panRef.current = pan }, [pan])
  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  // ── Admin assets reload ──────────────────────────────────────────────
  useEffect(() => {
    const onFocus = () => setAssets(getAdminAssets())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
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
    window.__editorWalls    = walls
    window.__editorPlaced   = placed
    window.__editorOpenings = openings
    window.__editorFloorTex = floorTex
    window.__editorFloor = floorRect
    window.__editorFloorColor = floorColor
    window.__editorWallTex  = wallTex
    window.__editorWallColor = wallColor
    if (onDesignChange) onDesignChange({ walls, placed, openings, floorTex, floorRect, floorColor, wallTex, wallColor })
  }, [walls, placed, openings, floorTex, floorRect, floorColor, wallTex, wallColor])

  // ── Restore from saved project when EditorPage signals load ──────────
  useEffect(() => {
    if (!window.__editorRestoreSignal) return
    const w  = window.__editorWalls     || []
    const p  = window.__editorPlaced    || []
    const o  = window.__editorOpenings  || []
    const f  = window.__editorFloorTex  || null
    const fr = window.__editorFloor     || null
    const fc = window.__editorFloorColor || '#f5f2ee'
    const t  = window.__editorWallTex   || null
    const wc = window.__editorWallColor || '#e8e2d8'
    setWalls(w);  setPlaced(p);  setOpenings(o)
    setFloorTex(f);  setFloorRect(fr); setFloorColor(fc); setWallTex(t);  setWallColor(wc)
    undoStack.current = []
    redoStack.current = []
    delete window.__editorRestoreSignal
  }, [])

  // ── Undo / Redo — full stack, resets on save ─────────────────────────
  const undoStack = useRef([])
  const redoStack = useRef([])

  const getSnap = () => ({
    walls:    wallsRef.current.map(w => ({...w})),
    placed:   placedRef.current.map(p => ({...p})),
    openings: openingsRef.current.map(o => ({...o})),
  })

  const applySnap = (s) => {
    wallsRef.current    = s.walls
    placedRef.current   = s.placed
    openingsRef.current = s.openings
    setWalls(s.walls)
    setPlaced(s.placed)
    setOpenings(s.openings)
    window.__editorWalls    = s.walls
    window.__editorPlaced   = s.placed
    window.__editorOpenings = s.openings
  }

  // pushHistory: save current state to undo stack then apply new state
  const pushHistory = useCallback((newWalls, newPlaced, newOpenings) => {
    const w = newWalls    !== undefined ? newWalls    : wallsRef.current
    const p = newPlaced   !== undefined ? newPlaced   : placedRef.current
    const o = newOpenings !== undefined ? newOpenings : openingsRef.current
    undoStack.current.push(getSnap())
    redoStack.current = []
    wallsRef.current    = w
    placedRef.current   = p
    openingsRef.current = o
    setWalls(w);  setPlaced(p);  setOpenings(o)
    window.__editorWalls    = w
    window.__editorPlaced   = p
    window.__editorOpenings = o
  }, [])

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    redoStack.current.push(getSnap())
    applySnap(undoStack.current.pop())
  }, [])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    undoStack.current.push(getSnap())
    applySnap(redoStack.current.pop())
  }, [])

  window.__editorClearHistory = () => {
    undoStack.current = []
    redoStack.current = []
  }

  useEffect(() => {
    window.__editorUndo = undo
    window.__editorRedo = redo
  }, [undo, redo])

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
      if (e.key === 'Escape') { setDrawStart(null); setSelectedWall(null); setSelectedItem(null) }
      if (e.key === 'Delete') {
        if (selectedWall !== null) {
          const newWalls = wallsRef.current.filter(w => w.id !== selectedWall)
          pushHistory(newWalls, placedRef.current, openingsRef.current)
          setSelectedWall(null)
        }
        if (selectedItem !== null) {
          const newPlaced = placedRef.current.filter(p => p.id !== selectedItem)
          pushHistory(wallsRef.current, newPlaced, openingsRef.current)
          setSelectedItem(null)
        }
        if (selectedOpening !== null) {
          const newOpenings = openingsRef.current.filter(o => o.id !== selectedOpening)
          pushHistory(wallsRef.current, placedRef.current, newOpenings)
          setSelectedOpening(null)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedWall, selectedItem, walls, pushHistory])

  // ── Draw ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth  || 900
    canvas.height = canvas.offsetHeight || 550
    const W = canvas.width, H = canvas.height

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Background
    ctx.fillStyle = '#eef1f7'
    ctx.fillRect(0, 0, W / zoom, H / zoom)

    // Floor (drawn area)
    if (floorRect && floorRect.w > 0 && floorRect.h > 0) {
      if (floorTex && loadedImages[floorTex.id]) {
        ctx.fillStyle = ctx.createPattern(loadedImages[floorTex.id], 'repeat') || floorColor
        ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h)
      } else {
        ctx.fillStyle = floorColor
        ctx.fillRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h)

        const tileSize = GRID
        ctx.strokeStyle = 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 0.7
        for (let x = floorRect.x; x <= floorRect.x + floorRect.w; x += tileSize) {
          ctx.beginPath(); ctx.moveTo(x, floorRect.y); ctx.lineTo(x, floorRect.y + floorRect.h); ctx.stroke()
        }
        for (let y = floorRect.y; y <= floorRect.y + floorRect.h; y += tileSize) {
          ctx.beginPath(); ctx.moveTo(floorRect.x, y); ctx.lineTo(floorRect.x + floorRect.w, y); ctx.stroke()
        }
      }

      ctx.strokeStyle = 'rgba(67,217,173,0.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(floorRect.x, floorRect.y, floorRect.w, floorRect.h)
      ctx.setLineDash([])
    }

    if (bgImage) {
      ctx.globalAlpha = bgOpacity
      const sc = Math.min((W / zoom) / bgImage.width, (H / zoom) / bgImage.height)
      ctx.drawImage(bgImage, ((W/zoom) - bgImage.width*sc)/2, ((H/zoom) - bgImage.height*sc)/2, bgImage.width*sc, bgImage.height*sc)
      ctx.globalAlpha = 1
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5
      for (let x = 0; x < W / zoom; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H / zoom); ctx.stroke() }
      for (let y = 0; y < H / zoom; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W / zoom, y); ctx.stroke() }
    }

    // ── Draw placed furniture ──────────────────────────────────────────
    placed.forEach(item => {
      const isSelected = selectedItem === item.id
      const img = loadedImages[item.id]
      const { x, y, w, h, angle = 0 } = item
      const cx = x + w / 2, cy = y + h / 2

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)

      // Selection highlight
      if (isSelected) {
        ctx.strokeStyle = '#6c63ff'
        ctx.lineWidth = 2 / zoom
        ctx.setLineDash([4 / zoom, 3 / zoom])
        ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6)
        ctx.setLineDash([])
      }

      if (img) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
      } else {
        ctx.fillStyle = 'rgba(108,99,255,0.15)'
        ctx.fillRect(-w / 2, -h / 2, w, h)
        ctx.fillStyle = '#888'; ctx.font = `${10 / zoom}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(item.name, 0, 0)
      }

      // Label
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(item.name, 0, h / 2 + 12 / zoom)

      ctx.restore()

      // ── Draw handles for selected item ─────────────────────────────
      if (isSelected) {
        const handles = getItemHandles(item)
        const hr = HANDLE_R / zoom

        // Resize corners
        ;[handles.tl, handles.tr, handles.br, handles.bl].forEach(pt => {
          ctx.beginPath(); ctx.arc(pt.x, pt.y, hr, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'; ctx.fill()
          ctx.strokeStyle = '#6c63ff'; ctx.lineWidth = 1.5 / zoom; ctx.stroke()
        })

        // Dashed line to rotate handle
        ctx.setLineDash([3 / zoom, 3 / zoom])
        ctx.strokeStyle = 'rgba(108,99,255,0.5)'; ctx.lineWidth = 1 / zoom
        ctx.beginPath()
        ctx.moveTo(cx, y)
        ctx.lineTo(handles.rot.x, handles.rot.y)
        ctx.stroke()
        ctx.setLineDash([])

        // Rotate handle (circular with arrow indicator)
        ctx.beginPath(); ctx.arc(handles.rot.x, handles.rot.y, hr * 1.2, 0, Math.PI * 2)
        ctx.fillStyle = '#6c63ff'; ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `bold ${10 / zoom}px sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('↻', handles.rot.x, handles.rot.y + 3.5 / zoom)

        // Size badge
        ctx.fillStyle = 'rgba(108,99,255,0.85)'
        const bw = 52 / zoom, bh = 16 / zoom
        ctx.beginPath(); ctx.roundRect(cx - bw / 2, y + h + 16 / zoom, bw, bh, 3 / zoom); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = `bold ${9 / zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText(`${Math.round(w * 5)}×${Math.round(h * 5)}cm`, cx, y + h + 27 / zoom)
      }
    })

    // ── Walls ──────────────────────────────────────────────────────────
    walls.forEach(wall => {
      const sel = selectedWall === wall.id
      if (wallTex && loadedImages[wallTex.id]) {
        ctx.save()
        const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = -dy / len * 5, ny = dx / len * 5
        ctx.beginPath()
        ctx.moveTo(wall.start.x + nx, wall.start.y + ny)
        ctx.lineTo(wall.end.x + nx, wall.end.y + ny)
        ctx.lineTo(wall.end.x - nx, wall.end.y - ny)
        ctx.lineTo(wall.start.x - nx, wall.start.y - ny)
        ctx.closePath()
        ctx.fillStyle = ctx.createPattern(loadedImages[wallTex.id], 'repeat'); ctx.fill()
        ctx.restore()
      } else {
        // Fill wall polygon with wallColor
        ctx.save()
        const dx2 = wall.end.x - wall.start.x, dy2 = wall.end.y - wall.start.y
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        const nx2 = -dy2 / len2 * 5, ny2 = dx2 / len2 * 5
        ctx.beginPath()
        ctx.moveTo(wall.start.x + nx2, wall.start.y + ny2)
        ctx.lineTo(wall.end.x + nx2, wall.end.y + ny2)
        ctx.lineTo(wall.end.x - nx2, wall.end.y - ny2)
        ctx.lineTo(wall.start.x - nx2, wall.start.y - ny2)
        ctx.closePath()
        ctx.fillStyle = sel ? wallColor : wallColor; ctx.fill()
        ctx.restore()
      }
      ctx.strokeStyle = sel ? '#6c63ff' : wallColor
      ctx.lineWidth = sel ? 10 : 8; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(wall.start.x, wall.start.y); ctx.lineTo(wall.end.x, wall.end.y); ctx.stroke()
      ctx.fillStyle = '#43d9ad'
      ;[wall.start, wall.end].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill() })
      const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y
      const len = Math.round(Math.sqrt(dx * dx + dy * dy) * 5)
      const mx = (wall.start.x + wall.end.x) / 2, my = (wall.start.y + wall.end.y) / 2
      ctx.fillStyle = 'rgba(108,99,255,0.85)'; ctx.beginPath(); ctx.roundRect(mx - 24, my - 20, 48, 16, 3); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px DM Sans,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${len} cm`, mx, my - 8)
    })


    // ── Draw openings (doors & windows) on walls ──────────────────────────────
    openings.forEach(op => {
      const wall = walls.find(w => w.id === op.wallId)
      if (!wall) return
      const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y
      const len = Math.sqrt(dx*dx + dy*dy)
      const ux = dx/len, uy = dy/len   // unit along wall
      const nx = -uy, ny = ux           // unit normal to wall
      const W2 = op.width / 2
      const cx = wall.start.x + dx*op.t
      const cy = wall.start.y + dy*op.t
      const isSel = selectedOpening === op.id

      // Clear the wall gap — draw floor color over wall
      ctx.save()
      ctx.strokeStyle = floorColor || '#f5f2ee'
      ctx.lineWidth = 12
      ctx.lineCap = 'butt'
      ctx.beginPath()
      ctx.moveTo(cx - ux*W2, cy - uy*W2)
      ctx.lineTo(cx + ux*W2, cy + uy*W2)
      ctx.stroke()
      ctx.restore()

      if (op.type === 'door') {
        // Door: gap line + arc sweep showing swing
        ctx.strokeStyle = isSel ? '#6c63ff' : '#2d6a4f'
        ctx.lineWidth = 2.5; ctx.lineCap = 'round'
        // Door slab
        ctx.beginPath()
        ctx.moveTo(cx - ux*W2, cy - uy*W2)
        ctx.lineTo(cx + ux*W2, cy + uy*W2)
        ctx.stroke()
        // Swing arc
        ctx.strokeStyle = isSel ? 'rgba(108,99,255,0.5)' : 'rgba(45,106,79,0.4)'
        ctx.lineWidth = 1; ctx.setLineDash([3,3])
        ctx.beginPath()
        const startAngle = Math.atan2(-ux, uy)
        ctx.arc(cx - ux*W2, cy - uy*W2, op.width, startAngle, startAngle + Math.PI/2)
        ctx.stroke()
        ctx.setLineDash([])
        // Label
        ctx.fillStyle = isSel ? '#6c63ff' : '#2d6a4f'
        ctx.font = `bold ${9/zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('Door', cx + ny*18, cy + ny*18)
      } else {
        // Window: double line with glass fill
        ctx.save()
        const wh = 8 // window visual half-width perpendicular
        ctx.fillStyle = 'rgba(173,216,230,0.55)'
        ctx.beginPath()
        ctx.moveTo(cx - ux*W2 + nx*wh, cy - uy*W2 + ny*wh)
        ctx.lineTo(cx + ux*W2 + nx*wh, cy + uy*W2 + ny*wh)
        ctx.lineTo(cx + ux*W2 - nx*wh, cy + uy*W2 - ny*wh)
        ctx.lineTo(cx - ux*W2 - nx*wh, cy - uy*W2 - ny*wh)
        ctx.closePath(); ctx.fill()
        ctx.strokeStyle = isSel ? '#6c63ff' : '#1a7abf'
        ctx.lineWidth = 2; ctx.lineCap = 'square'
        // Two parallel lines
        ;[-1, 1].forEach(side => {
          ctx.beginPath()
          ctx.moveTo(cx - ux*W2 + nx*wh*side, cy - uy*W2 + ny*wh*side)
          ctx.lineTo(cx + ux*W2 + nx*wh*side, cy + uy*W2 + ny*wh*side)
          ctx.stroke()
        })
        // Center divider
        ctx.beginPath()
        ctx.moveTo(cx + nx*wh, cy + ny*wh)
        ctx.lineTo(cx - nx*wh, cy - ny*wh)
        ctx.stroke()
        ctx.restore()
        ctx.fillStyle = isSel ? '#6c63ff' : '#1a7abf'
        ctx.font = `bold ${9/zoom}px DM Sans,sans-serif`; ctx.textAlign = 'center'
        ctx.fillText('Win', cx + ny*20, cy + ny*20)
      }

      // Selection dot
      if (isSel) {
        ctx.beginPath(); ctx.arc(cx, cy, 5/zoom, 0, Math.PI*2)
        ctx.fillStyle = '#6c63ff'; ctx.fill()
      }
    })

    // Wall preview
    if (drawStart && activeTool === 'wall') {
      const ex = snap(mousePos.x), ey = snap(mousePos.y)
      ctx.strokeStyle = 'rgba(108,99,255,0.55)'; ctx.lineWidth = 6
      ctx.setLineDash([8, 4])
      ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.setLineDash([])
      const dx = ex - drawStart.x, dy = ey - drawStart.y
      const len = Math.round(Math.sqrt(dx * dx + dy * dy) * 5)
      const mx = (drawStart.x + ex) / 2, my = (drawStart.y + ey) / 2
      ctx.fillStyle = 'rgba(108,99,255,0.9)'; ctx.beginPath(); ctx.roundRect(mx - 28, my - 21, 56, 17, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans,sans-serif'; ctx.textAlign = 'center'
      ctx.fillText(`${len} cm`, mx, my - 8)
    }

    // Floor preview
    if (drawStart && activeTool === 'floor') {
      const ex = snap(mousePos.x), ey = snap(mousePos.y)
      const x = Math.min(drawStart.x, ex)
      const y = Math.min(drawStart.y, ey)
      const w = Math.abs(ex - drawStart.x)
      const h = Math.abs(ey - drawStart.y)
      ctx.fillStyle = 'rgba(67,217,173,0.16)'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = 'rgba(67,217,173,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }

    // Crosshair
    if (activeTool === 'wall' || activeTool === 'floor') {
      const sx = snap(mousePos.x), sy = snap(mousePos.y)
      ctx.strokeStyle = activeTool === 'floor' ? 'rgba(67,217,173,0.75)' : 'rgba(108,99,255,0.6)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10); ctx.stroke()
      ctx.fillStyle = activeTool === 'floor' ? '#43d9ad' : '#6c63ff'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill()
    }

    ctx.restore()
  }, [walls, drawStart, mousePos, showGrid, bgImage, bgOpacity, placed, openings, selectedWall, selectedItem, selectedOpening, activeTool, floorTex, floorRect, floorColor, wallTex, wallColor, loadedImages, zoom, pan])

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

  // ── Mouse down — determine what we're interacting with ───────────────
  const handleMouseDown = useCallback((e) => {
    // Middle mouse: pan
    if (e.button === 1) {
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

      // Check handles first (only if item is selected)
      if (sel !== null) {
        const item = items.find(p => p.id === sel)
        if (item) {
          const handle = hitHandle(mx, my, item, zoomRef.current)
          if (handle) {
            e.preventDefault()
            dragState.current = { type: handle === 'rot' ? 'rotate' : `resize-${handle}`, startMx: mx, startMy: my, origItem: { ...item } }
            return
          }
          // Clicked inside selected item → move
          if (hitItem(mx, my, item)) {
            e.preventDefault()
            dragState.current = { type: 'move', startMx: mx, startMy: my, origItem: { ...item } }
            return
          }
        }
      }

      // Hit test all items (reverse for top-first)
      const hit = [...items].reverse().find(p => hitItem(mx, my, p))
      if (hit) {
        setSelectedItem(hit.id); setSelectedWall(null)
        dragState.current = { type: 'move', startMx: mx, startMy: my, origItem: { ...hit } }
        return
      }

      // Hit test openings
      const hitOpening = openingsRef.current.find(op => {
        const wall = walls.find(w => w.id === op.wallId); if (!wall) return false
        const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y
        const cx = wall.start.x + dx*op.t, cy = wall.start.y + dy*op.t
        return Math.sqrt((mx-cx)**2 + (my-cy)**2) < 20
      })
      if (hitOpening) { setSelectedOpening(hitOpening.id); setSelectedItem(null); setSelectedWall(null); return }

      // Hit test walls
      const hitWall = walls.find(w => {
        const dx = w.end.x - w.start.x, dy = w.end.y - w.start.y
        const len = Math.sqrt(dx * dx + dy * dy); if (!len) return false
        const t = Math.max(0, Math.min(1, ((mx - w.start.x) * dx + (my - w.start.y) * dy) / (len * len)))
        const nx = w.start.x + t * dx - mx, ny = w.start.y + t * dy - my
        return Math.sqrt(nx * nx + ny * ny) < 10
      })
      setSelectedWall(hitWall?.id ?? null)
      setSelectedItem(null)
      setSelectedOpening(null)
    }

    if (activeTool === 'wall') {
      const pos = getPos(e)
      if (!drawStart) { setDrawStart(pos) }
      else {
        const newWalls = [...wallsRef.current, { id: Date.now(), start: drawStart, end: pos }]
        pushHistory(newWalls, placedRef.current, openingsRef.current)
        setDrawStart(pos)
      }
    }

    if (activeTool === 'floor') {
      const pos = getPos(e)
      setDrawStart(pos)
      setSelectedWall(null)
      setSelectedItem(null)
      setSelectedOpening(null)
    }

    if (activeTool === 'door' || activeTool === 'window') {
      // Find closest wall and compute t (0..1 along wall)
      let bestWall = null, bestT = 0, bestDist = Infinity
      walls.forEach(wall => {
        const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y
        const len2 = dx*dx + dy*dy; if (!len2) return
        const t = Math.max(0.05, Math.min(0.95, ((mx-wall.start.x)*dx + (my-wall.start.y)*dy) / len2))
        const px = wall.start.x + t*dx, py = wall.start.y + t*dy
        const dist = Math.sqrt((mx-px)**2 + (my-py)**2)
        if (dist < bestDist && dist < 30) { bestDist = dist; bestWall = wall; bestT = t }
      })
      if (bestWall) {
        const newOpening = {
          id: `op_${Date.now()}`,
          wallId: bestWall.id,
          t: bestT,
          type: activeTool,
          width: activeTool === 'door' ? 80 : 60,
        }
        const newOpenings = [...openingsRef.current, newOpening]
        pushHistory(wallsRef.current, placedRef.current, newOpenings)
        setSelectedOpening(newOpening.id)
        setSelectedItem(null); setSelectedWall(null)
      }
    }
  }, [activeTool, walls, drawStart, pushHistory, screenToWorld])

  // ── Mouse move — perform drag operations ─────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect()
    const rawX = e.clientX - r.left, rawY = e.clientY - r.top

    // Update crosshair/preview position
    setMousePos({
      x: (rawX - panRef.current.x) / zoomRef.current,
      y: (rawY - panRef.current.y) / zoomRef.current,
    })

    // Pan
    if (isPanning.current) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
      return
    }

    const ds = dragState.current
    if (!ds) return

    const world = screenToWorld(e.clientX, e.clientY)
    const mx = world.x, my = world.y
    const { origItem } = ds
    const dx = mx - ds.startMx, dy = my - ds.startMy

    if (ds.type === 'move') {
      setPlaced(prev => prev.map(p => p.id === origItem.id
        ? { ...p, x: snap(origItem.x + dx), y: snap(origItem.y + dy) }
        : p
      ))

    } else if (ds.type === 'rotate') {
      const cx = origItem.x + origItem.w / 2
      const cy = origItem.y + origItem.h / 2
      const angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2
      setPlaced(prev => prev.map(p => p.id === origItem.id ? { ...p, angle } : p))

    } else if (ds.type.startsWith('resize-')) {
      const corner = ds.type.replace('resize-', '')
      const { x, y, w, h, angle: a = 0 } = origItem
      const cx = x + w / 2, cy = y + h / 2

      // Rotate delta into item-local space
      const cos = Math.cos(-a), sin = Math.sin(-a)
      const ldx = dx * cos - dy * sin
      const ldy = dx * sin + dy * cos

      let nx = x, ny = y, nw = w, nh = h
      if (corner === 'br') { nw = Math.max(GRID, snap(w + ldx)); nh = Math.max(GRID, snap(h + ldy)) }
      if (corner === 'bl') { nx = snap(x + (w - Math.max(GRID, snap(w - ldx)))); nw = Math.max(GRID, snap(w - ldx)); nh = Math.max(GRID, snap(h + ldy)) }
      if (corner === 'tr') { nw = Math.max(GRID, snap(w + ldx)); ny = snap(y + (h - Math.max(GRID, snap(h - ldy)))); nh = Math.max(GRID, snap(h - ldy)) }
      if (corner === 'tl') {
        nx = snap(x + (w - Math.max(GRID, snap(w - ldx)))); nw = Math.max(GRID, snap(w - ldx))
        ny = snap(y + (h - Math.max(GRID, snap(h - ldy)))); nh = Math.max(GRID, snap(h - ldy))
      }
      setPlaced(prev => prev.map(p => p.id === origItem.id ? { ...p, x: nx, y: ny, w: nw, h: nh } : p))
    }

    // Update cursor
    const canvas = canvasRef.current
    if (ds.type === 'move') canvas.style.cursor = 'grabbing'
    else if (ds.type === 'rotate') canvas.style.cursor = 'crosshair'
    else canvas.style.cursor = 'nwse-resize'
  }, [screenToWorld])

  // ── Mouse up — end drag ───────────────────────────────────────────────
  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) { isPanning.current = false; return }

    if (e.button === 0 && activeTool === 'floor' && drawStart) {
      const world = screenToWorld(e.clientX, e.clientY)
      const ex = snap(world.x), ey = snap(world.y)
      const x = Math.min(drawStart.x, ex)
      const y = Math.min(drawStart.y, ey)
      const w = Math.abs(ex - drawStart.x)
      const h = Math.abs(ey - drawStart.y)
      if (w >= GRID && h >= GRID) {
        setFloorRect({ x, y, w, h })
      }
      setDrawStart(null)
      if (canvasRef.current) canvasRef.current.style.cursor = ''
      return
    }

    if (dragState.current) {
      // Push to undo stack: restore original item state before drag
      const orig = dragState.current.origItem
      if (orig) {
        redoStack.current = []
        undoStack.current.push({
          walls:    wallsRef.current.map(w => ({...w})),
          placed:   placedRef.current.map(p => p.id === orig.id ? {...orig} : {...p}),
          openings: openingsRef.current.map(o => ({...o})),
        })
      }
    }
    dragState.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = ''
  }, [activeTool, drawStart, screenToWorld])

  const handleDblClick   = () => setDrawStart(null)
  const handleRightClick = (e) => { e.preventDefault(); setDrawStart(null) }

  const rotateSelected = (delta) => {
    if (!selectedItem) return
    setPlaced(prev => prev.map(p =>
      p.id === selectedItem ? { ...p, angle: (p.angle || 0) + delta } : p
    ))
  }

  const updateSelectedColor = (color) => {
    if (!selectedItem || !color) return
    setPlaced(prev => prev.map(p =>
      p.id === selectedItem ? { ...p, color } : p
    ))
  }

  const deleteSelected = () => {
    if (selectedItem) {
      const newPlaced = placedRef.current.filter(p => p.id !== selectedItem)
      pushHistory(wallsRef.current, newPlaced, openingsRef.current)
      setSelectedItem(null)
    }
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const r = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - r.left, mouseY = e.clientY - r.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(zoomRef.current * delta, 0.1), 5)
    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * (newZoom / zoomRef.current),
      y: mouseY - (mouseY - prev.y) * (newZoom / zoomRef.current),
    }))
    window.__setEditorZoom && window.__setEditorZoom(newZoom)
  }, [])

  // ── Cursor style based on hover ──────────────────────────────────────
  const handleMouseMoveForCursor = useCallback((e) => {
    if (dragState.current) return
    if (activeTool !== 'select') return
    const world = screenToWorld(e.clientX, e.clientY)
    const sel = selectedRef.current
    const items = placedRef.current
    const canvas = canvasRef.current; if (!canvas) return

    if (sel !== null) {
      const item = items.find(p => p.id === sel)
      if (item) {
        const handle = hitHandle(world.x, world.y, item, zoomRef.current)
        if (handle === 'rot') { canvas.style.cursor = 'grab'; return }
        if (handle) { canvas.style.cursor = 'nwse-resize'; return }
        if (hitItem(world.x, world.y, item)) { canvas.style.cursor = 'move'; return }
      }
    }
    const hit = items.find(p => hitItem(world.x, world.y, p))
    canvas.style.cursor = hit ? 'move' : ''
  }, [activeTool, screenToWorld])

  // Merge mouse move handlers
  const onMouseMove = useCallback((e) => {
    handleMouseMove(e)
    handleMouseMoveForCursor(e)
  }, [handleMouseMove, handleMouseMoveForCursor])

  // ── Drop furniture ───────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('furniture'); if (!raw) return
    const item = JSON.parse(raw)
    const r = canvasRef.current.getBoundingClientRect()
    const x = snap((e.clientX - r.left - panRef.current.x) / zoomRef.current - 40)
    const y = snap((e.clientY - r.top  - panRef.current.y) / zoomRef.current - 40)
    const newItem = {
      ...item,
      id: `pf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, // AFTER spread to override item.id
      x, y,
      w: item.w || item.width || 80,
      h: item.d || item.depth || 80,
      angle: 0,
      color: item.color || '#8b6b4a',
      model3d: item.model3d || null,
    }
    // Save snapshot BEFORE adding
    undoStack.current.push({
      walls:    wallsRef.current.map(w => ({...w})),
      placed:   placedRef.current.map(p => ({...p})),
      openings: openingsRef.current.map(o => ({...o})),
    })
    redoStack.current = []
    const next = [...placedRef.current, newItem]
    placedRef.current = next
    setPlaced(next)
    window.__editorPlaced = next
    setSelectedItem(newItem.id)
    const img = new Image(); img.src = item.image
    img.onload = () => setLoadedImages(prev => ({ ...prev, [newItem.id]: img }))
  }

  const handleBlueprintUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { const img = new Image(); img.onload = () => setBgImage(img); img.src = ev.target.result }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const wallTextures  = assets.textures.filter(t => t.type === 'wall')
  const floorTextures = assets.textures.filter(t => t.type === 'floor')

  const selItem = placed.find(p => p.id === selectedItem)

  return (
    <div className="canvas2d-root">

      {/* ── Canvas area ────────────────────────────────────────────── */}
      <div className="canvas2d-main">

        {/* Toolbar */}
        <div className="canvas2d-toolbar">
          {bgImage && (
            <>
              <input type="range" min="0.05" max="1" step="0.05" value={bgOpacity}
                onChange={e => setBgOpacity(Number(e.target.value))}
                className="canvas2d-toolbar__bg-range" />
              <button className="canvas2d-toolbar__btn--danger" onClick={() => setBgImage(null)}>✕ BG</button>
            </>
          )}
          <button className={`canvas2d-toolbar__btn${texPanel ? ' canvas2d-toolbar__btn--active' : ''}`}
            onClick={() => setTexPanel(!texPanel)}>
            Textures
          </button>
          {(floorTex || wallTex) && (
            <div className="canvas2d-toolbar__tex-tags">
              {floorTex && <span className="canvas2d-toolbar__tex-tag--floor">Floor: {floorTex.name}</span>}
              {wallTex  && <span className="canvas2d-toolbar__tex-tag--wall">Wall: {wallTex.name}</span>}
              <button onClick={() => { setFloorTex(null); setWallTex(null) }} className="canvas2d-toolbar__clear-btn">✕</button>
            </div>
          )}

          {selItem && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint">
                {selItem.name} · {Math.round(selItem.w * 5)}×{Math.round(selItem.h * 5)}cm
              </span>
              <label className="canvas2d-toolbar__hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Color
                <input
                  type="color"
                  value={selItem.color || '#8b6b4a'}
                  onChange={(e) => updateSelectedColor(e.target.value)}
                  style={{ width: 26, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
              </label>
              <button onClick={() => rotateSelected(-Math.PI/2)} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--purple">↺ 90°</button>
              <button onClick={() => rotateSelected( Math.PI/2)} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--purple">↻ 90°</button>
              <button onClick={deleteSelected} className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--red">🗑 Delete</button>
            </div>
          )}

          {selectedWall && !selItem && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--teal">Wall selected</span>
              <button onClick={() => { setWalls(w => w.filter(w2 => w2.id !== selectedWall)); setSelectedWall(null) }}
                className="canvas2d-toolbar__action-btn canvas2d-toolbar__action-btn--red">🗑 Delete</button>
            </div>
          )}

          {activeTool === 'floor' && !selItem && !selectedWall && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--teal">▭ Click and drag to draw floor area</span>
            </div>
          )}

          {!selItem && !selectedWall && activeTool !== 'floor' && (
            <div className="canvas2d-toolbar__actions">
              <span className="canvas2d-toolbar__hint canvas2d-toolbar__hint--dim">
                {activeTool === 'wall' ? '✏ Click to draw walls · Double-click to finish' : '↖ Click to select · Drag to move · Corner handles to resize · ↻ to rotate'}
              </span>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBlueprintUpload} />
        </div>

        {/* Texture panel */}
        {texPanel && (
          <div className="canvas2d-tex-panel">
            {/* Wall Color */}
            <div>
              <div className="canvas2d-tex-section__label"> WALL COLOR</div>
              <div className="canvas2d-tex-section__swatches">
                {['#e8e2d8','#2d2a4a','#1a3a4a','#4a2a1a','#1a4a2a','#3a1a4a','#4a3a1a','#1a1a1a','#f5f0e8','#c8b89a'].map(col => (
                  <div key={col} onClick={() => { setWallColor(col); setWallTex(null) }}
                    className={`canvas2d-color-swatch${wallColor === col && !wallTex ? ' canvas2d-color-swatch--active' : ''}`}
                    style={{ background: col }} />
                ))}
                <div className="canvas2d-color-picker-wrap">
                  <div className="canvas2d-color-picker-icon" style={{ background: wallColor }}>🖊</div>
                  <input type="color" value={wallColor}
                    onChange={e => { setWallColor(e.target.value); setWallTex(null) }}
                    className="canvas2d-color-picker-input" />
                </div>
              </div>
            </div>

            {/* Floor Textures */}
            <div>
              <div className="canvas2d-tex-section__label"> FLOOR COLOR</div>
              <div className="canvas2d-tex-section__swatches">
                {['#f5f2ee','#d7c8aa','#bfa58b','#9b8a72','#7f6c58','#5e5246','#2c2c32','#e8efe6','#c4d0b8','#bcd2e5'].map(col => (
                  <div key={col} onClick={() => { setFloorColor(col); setFloorTex(null) }}
                    className={`canvas2d-color-swatch${floorColor === col && !floorTex ? ' canvas2d-color-swatch--active' : ''}`}
                    style={{ background: col }} />
                ))}
                <div className="canvas2d-color-picker-wrap">
                  <div className="canvas2d-color-picker-icon" style={{ background: floorColor }}>🖊</div>
                  <input type="color" value={floorColor}
                    onChange={e => { setFloorColor(e.target.value); setFloorTex(null) }}
                    className="canvas2d-color-picker-input" />
                </div>
              </div>
            </div>

            {/* Floor Textures */}
            <div>
              <div className="canvas2d-tex-section__label"> FLOOR TEXTURES</div>
              <div className="canvas2d-tex-section__swatches">
                <button onClick={() => setFloorTex(null)}
                  className={`canvas2d-tex-swatch--none ${!floorTex ? 'canvas2d-tex-swatch--none-floor-active' : 'canvas2d-tex-swatch--none-inactive'}`}>∅</button>
                {floorTextures.map(t => (
                  <div key={t.id} onClick={() => setFloorTex(t)}
                    className={`canvas2d-tex-img ${floorTex?.id === t.id ? 'canvas2d-tex-img--floor-active' : 'canvas2d-tex-img--floor-inactive'}`}>
                    <img src={t.image} alt={t.name} />
                  </div>
                ))}
                {floorTextures.length === 0 && <span className="canvas2d-tex-empty">None — go to Admin</span>}
              </div>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas ref={canvasRef}
          className={`canvas2d-canvas canvas2d-canvas--${activeTool === 'wall' || activeTool === 'floor' ? 'wall' : 'default'}`}
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