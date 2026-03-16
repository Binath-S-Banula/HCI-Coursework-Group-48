import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setMode, toggleGrid, setZoom } from '../store/slices/editorSlice'
import Canvas2D from '../components/editor/Canvas2D'
import Canvas3D from '../components/editor/Canvas3D'
import EditorToolbar from '../components/editor/EditorToolbar'
import FurniturePanel from '../components/furniture/FurniturePanel'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import toast from 'react-hot-toast'
import '../styles/pages/EditorPage.css'

// ── localStorage helpers ──────────────────────────────────────────────
const LS_KEY      = 'homeplan3d_projects'
const loadAll     = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const saveAll     = (list) => localStorage.setItem(LS_KEY, JSON.stringify(list))

function loadProject(id) {
  return loadAll().find(p => p.id === id) || null
}

function persistProject(id, patch) {
  const list = loadAll()
  const idx  = list.findIndex(p => p.id === id)
  if (idx === -1) return
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() }
  saveAll(list)
  return list[idx]
}

// ── Editor Page ───────────────────────────────────────────────────────
export default function EditorPage() {
  const { projectId } = useParams()
  const navigate      = useNavigate()
  const dispatch      = useDispatch()
  const { mode, zoom } = useSelector(s => s.editor)

  const [project,       setProject]       = useState(null)
  const [projectName,   setProjectName]   = useState('New Project')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [furnitureOpen, setFurnitureOpen] = useState(false)
  const [propsOpen,     setPropsOpen]     = useState(false)
  const [isSaving,      setIsSaving]      = useState(false)
  const [lastSaved,     setLastSaved]     = useState(null)
  const autoSaveTimer = useRef(null)

  // ── Load project on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return

    const proj = loadProject(projectId)
    if (!proj) {
      toast.error('Project not found')
      navigate('/dashboard')
      return
    }
    setProject(proj)
    setProjectName(proj.name)

    // Restore canvas state into globals so Canvas2D/3D can read them
    if (proj.walls)     window.__editorWalls     = proj.walls
    if (proj.placed)    window.__editorPlaced    = proj.placed
    if (proj.openings)  window.__editorOpenings  = proj.openings
    if (proj.floorTex)  window.__editorFloorTex  = proj.floorTex
    if (proj.wallTex)   window.__editorWallTex   = proj.wallTex
    window.__editorWallColor = proj.wallColor || '#e8e2d8'

    // Signal canvases to reload from globals
    window.__editorRestoreSignal = Date.now()
  }, [projectId])

  // ── Zoom helper ───────────────────────────────────────────────────
  useEffect(() => {
    window.__setEditorZoom = (z) => dispatch(setZoom(z))
    return () => { delete window.__setEditorZoom }
  }, [dispatch])

  // ── Auto-save every 30s ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    autoSaveTimer.current = setInterval(() => {
      doSave(true)
    }, 30000)
    return () => clearInterval(autoSaveTimer.current)
  }, [projectId, projectName])

  // ── Collect current canvas state from globals ─────────────────────
  const collectState = () => ({
    walls:          window.__editorWalls     || [],
    placed:         window.__editorPlaced    || [],
    openings:       window.__editorOpenings  || [],
    floorTex:       window.__editorFloorTex  || null,
    wallTex:        window.__editorWallTex   || null,
    wallColor:      window.__editorWallColor || '#e8e2d8',
    wallCount:      (window.__editorWalls    || []).length,
    furnitureCount: (window.__editorPlaced   || []).length,
    thumbnail:      captureThumb(),
  })

  // ── Capture a thumbnail from the 2D canvas ────────────────────────
  const captureThumb = () => {
    try {
      const canvas = document.querySelector('.editor-canvas-area canvas')
      if (canvas) return canvas.toDataURL('image/jpeg', 0.5)
    } catch {}
    return null
  }

  // ── Save ──────────────────────────────────────────────────────────
  const doSave = (silent = false) => {
    if (!projectId) return
    if (!silent) setIsSaving(true)

    const state = collectState()
    const patch = { name: projectName, ...state }
    persistProject(projectId, patch)
    setLastSaved(new Date())

    if (!silent) {
      setTimeout(() => {
        setIsSaving(false)
        toast.success('Project saved!')
      }, 500)
    }
  }

  // ── Rename ────────────────────────────────────────────────────────
  const commitRename = (newName) => {
    const name = newName.trim() || projectName
    setProjectName(name)
    setRenamingTitle(false)
    if (projectId) persistProject(projectId, { name })
  }

  return (
    <div className="editor-page">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="editor-topbar">
        <div className="editor-topbar__left">
          <button
            style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:'inherit', padding:0 }}
            onClick={() => { doSave(true); navigate('/dashboard') }}>
            <div className="editor-topbar__logo">H</div>
            <span className="editor-topbar__name">HomePlan3D</span>
          </button>
          <span style={{ color:'rgba(255,255,255,0.1)' }}>|</span>

          {/* Editable project name */}
          {renamingTitle ? (
            <input
              autoFocus
              defaultValue={projectName}
              onBlur={e => commitRename(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  commitRename(e.target.value)
                if (e.key === 'Escape') setRenamingTitle(false)
              }}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(108,99,255,0.4)', borderRadius:6, color:'#e8e8f0', padding:'3px 8px', fontSize:13, outline:'none', width:180 }}
            />
          ) : (
            <span
              className="editor-topbar__project-name"
              onDoubleClick={() => setRenamingTitle(true)}
              title="Double-click to rename"
              style={{ cursor:'text' }}>
              {projectName}
            </span>
          )}

          {isSaving && <span style={{ color:'#555', fontSize:'0.75rem' }}>Saving…</span>}
          {lastSaved && !isSaving && (
            <span style={{ color:'#333', fontSize:'0.7rem' }}>
              Saved {lastSaved.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </span>
          )}
        </div>

        <div className="editor-topbar__center">
          <div className="editor-mode-toggle">
            {['2d','3d'].map(m => (
              <button key={m} onClick={() => dispatch(setMode(m))}
                className={`editor-mode-btn ${mode===m ? 'editor-mode-btn--active' : 'editor-mode-btn--inactive'}`}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-topbar__right">
          <button
            onClick={() => setFurnitureOpen(!furnitureOpen)}
            className={`editor-topbar-btn${furnitureOpen ? ' editor-topbar-btn--active' : ''}`}>
            🪑 Furniture
          </button>
          <button onClick={() => doSave(false)} className="editor-topbar-btn editor-topbar-btn--save">
            {isSaving ? '⏳ Saving…' : '💾 Save'}
          </button>
          <button onClick={() => { doSave(true); navigate('/dashboard') }} className="editor-topbar-btn">
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="editor-body">
        <EditorToolbar />

        <div className="editor-canvas-area">

          {/* 2D — always mounted, hidden in 3D mode */}
          <div style={{ position:'absolute', inset:0, display: mode==='2d' ? 'flex' : 'none', flexDirection:'column' }}>
            <Canvas2D onPropertiesOpen={() => setPropsOpen(true)} />
          </div>

          {/* 3D — always mounted, hidden in 2D mode */}
          <div style={{ position:'absolute', inset:0, display: mode==='3d' ? 'block' : 'none' }}>
            <Canvas3D />
          </div>

          {/* Zoom controls — 2D only */}
          {mode === '2d' && (
            <div className="editor-zoom-controls">
              <button className="editor-zoom-btn" onClick={() => dispatch(setZoom(Math.max(0.1, zoom - 0.1)))}>−</button>
              <span className="editor-zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="editor-zoom-btn" onClick={() => dispatch(setZoom(zoom + 0.1))}>+</button>
            </div>
          )}

          {/* Grid toggle — 2D only */}
          {mode === '2d' && (
            <div className="editor-grid-toggle">
              <button className="editor-topbar-btn" onClick={() => dispatch(toggleGrid())}>⊞ Grid</button>
            </div>
          )}
        </div>

        {/* Furniture panel */}
        {furnitureOpen && (
          <div className="editor-side-panel editor-side-panel--narrow">
            <FurniturePanel />
          </div>
        )}

        {/* Properties panel */}
        {propsOpen && (
          <div className="editor-side-panel editor-side-panel--narrow">
            <PropertiesPanel onClose={() => setPropsOpen(false)} />
          </div>
        )}
      </div>
    </div>
  )
}