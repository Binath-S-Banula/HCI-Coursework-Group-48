import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Grid3X3, Loader2, Minus, PanelRightClose, PanelRightOpen, Plus, Save } from 'lucide-react'
import { setMode, toggleGrid, setZoom } from '../store/slices/editorSlice'
import Canvas2D from '../components/editor/Canvas2D'
import Canvas3D from '../components/editor/Canvas3D'
import EditorToolbar from '../components/editor/EditorToolbar'
import FurniturePanel from '../components/furniture/FurniturePanel'
import PropertiesPanel from '../components/editor/PropertiesPanel'
import { projectService } from '../services/project.service'
import toast from 'react-hot-toast'
import logoImage from '../uploads/homeland-logo.png'
import '../styles/pages/EditorPage.css'

// ── Editor Page ───────────────────────────────────────────────────────
export default function EditorPage() {
  const { projectId } = useParams()
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const dispatch      = useDispatch()
  const { mode, zoom } = useSelector(s => s.editor)

  const [project,       setProject]       = useState(null)
  const [projectName,   setProjectName]   = useState('New Project')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [furnitureOpen, setFurnitureOpen] = useState(true)
  const [propsOpen,     setPropsOpen]     = useState(false)
  const [isSaving,      setIsSaving]      = useState(false)
  const [lastSaved,     setLastSaved]     = useState(null)
  const [canvas3DSessionKey, setCanvas3DSessionKey] = useState(() => Date.now())
  const autoSaveTimer = useRef(null)

  useEffect(() => {
    setCanvas3DSessionKey(Date.now())
    window.dispatchEvent(new Event('editor-3d-reset'))
  }, [projectId])

  useEffect(() => {
    if (searchParams.get('view') === '3d') {
      dispatch(setMode('3d'))
    }
  }, [dispatch, searchParams])

  // ── Load project on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return

    const loadProject = async () => {
      try {
        const proj = await projectService.getOne(projectId)
        setProject(proj)
        setProjectName(proj.name)

        // Restore canvas state into globals so Canvas2D/3D can read them
        if (proj.walls)     window.__editorWalls     = proj.walls
        if (proj.placed)    window.__editorPlaced    = proj.placed
        if (proj.openings)  window.__editorOpenings  = proj.openings
        if (proj.floor)     window.__editorFloor     = proj.floor
        if (proj.floorTex)  window.__editorFloorTex  = proj.floorTex
        window.__editorFloorColor = proj.floorColor || '#f5f2ee'
        if (proj.wallTex)   window.__editorWallTex   = proj.wallTex
        window.__editorWallColor = proj.wallColor || '#e8e2d8'
        window.__editorLightIntensity = Number.isFinite(Number(proj.lightIntensity)) ? Number(proj.lightIntensity) : 1
        window.__editorTimeOfDay = ['morning', 'day', 'evening', 'night'].includes(proj.timeOfDay) ? proj.timeOfDay : 'day'

        // Signal canvases to reload from globals
        window.__editorRestoreSignal = Date.now()
        window.dispatchEvent(new Event('editor-3d-reset'))
      } catch {
        toast.error('Project not found')
        navigate('/dashboard')
      }
    }

    loadProject()
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
    floor:          window.__editorFloor     || null,
    floorTex:       window.__editorFloorTex  || null,
    floorColor:     window.__editorFloorColor || '#f5f2ee',
    wallTex:        window.__editorWallTex   || null,
    wallColor:      window.__editorWallColor || '#e8e2d8',
    lightIntensity: Number.isFinite(Number(window.__editorLightIntensity)) ? Number(window.__editorLightIntensity) : 1,
    timeOfDay:      ['morning', 'day', 'evening', 'night'].includes(window.__editorTimeOfDay) ? window.__editorTimeOfDay : 'day',
    wallCount:      (window.__editorWalls    || []).length,
    furnitureCount: (window.__editorPlaced   || []).length,
  })

  // ── Capture thumbnail from 3D canvas only ─────────────────────────
  const captureThumb = () => {
    try {
      const canvas = document.querySelector('.canvas3d-root canvas')
      if (canvas) return canvas.toDataURL('image/jpeg', 0.5)
    } catch {}
    return null
  }

  // ── Save ──────────────────────────────────────────────────────────
  const doSave = (silent = false) => {
    if (!projectId) return
    if (!silent) setIsSaving(true)

    const state = collectState()
    const capturedThumbnail = captureThumb()
    const patch = {
      name: projectName,
      ...state,
      ...(capturedThumbnail ? { thumbnail: capturedThumbnail } : (project?.thumbnail ? { thumbnail: project.thumbnail } : {})),
    }
    projectService.update(projectId, patch)
      .then((saved) => {
        setProject(saved)
        setLastSaved(new Date())
        if (!silent) {
          setIsSaving(false)
          toast.success('Project saved!')
        }
      })
      .catch(() => {
        if (!silent) {
          setIsSaving(false)
          toast.error('Failed to save project')
        }
      })
  }

  // ── Rename ────────────────────────────────────────────────────────
  const commitRename = (newName) => {
    const name = newName.trim() || projectName
    setProjectName(name)
    setRenamingTitle(false)
    if (projectId) projectService.update(projectId, { name }).catch(() => {})
  }

  return (
    <div className="editor-page">

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="editor-topbar">
        <div className="editor-topbar__left">
          <button
            style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:'inherit', padding:0 }}
            onClick={() => { doSave(true); navigate('/dashboard') }}>
            <img src={logoImage} alt="HomePlan3D Logo" className="editor-topbar__logo-image" />
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
          <button onClick={() => doSave(false)} className="editor-topbar-btn editor-topbar-btn--save">
            {isSaving ? <><Loader2 size={14} className="editor-spin" /> Saving…</> : <><Save size={14} /> Save</>}
          </button>
          <button onClick={() => { doSave(true); navigate('/dashboard') }} className="editor-topbar-btn">
            <ArrowLeft size={14} /> Dashboard
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="editor-body">
        <EditorToolbar />

        <div className="editor-workspace">
          <div className="editor-canvas-area">

          {/* Render only the active canvas to avoid hidden heavy renders */}
          {project && mode === '2d' && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
              <Canvas2D onPropertiesOpen={() => setPropsOpen(true)} />
            </div>
          )}

          {project && mode === '3d' && (
            <div style={{ position:'absolute', inset:0, display:'block' }}>
              <Canvas3D key={`${projectId || 'project-3d-default'}-${canvas3DSessionKey}`} />
            </div>
          )}

          {/* Zoom controls — 2D only */}
          {mode === '2d' && (
            <div className="editor-zoom-controls">
              <button className="editor-zoom-btn" onClick={() => dispatch(setZoom(Math.max(0.1, zoom - 0.1)))}><Minus size={14} /></button>
              <span className="editor-zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="editor-zoom-btn" onClick={() => dispatch(setZoom(zoom + 0.1))}><Plus size={14} /></button>
            </div>
          )}

          {/* Grid toggle — 2D only */}
          {mode === '2d' && (
            <div className="editor-grid-toggle">
              <button className="editor-topbar-btn" onClick={() => dispatch(toggleGrid())}><Grid3X3 size={14} /> Grid</button>
            </div>
          )}

          </div>

          <div className={`editor-furniture-dock ${furnitureOpen ? 'editor-furniture-dock--open' : 'editor-furniture-dock--closed'}`}>
            {furnitureOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => setFurnitureOpen(false)}
                  className="editor-furniture-dock__toggle"
                  title="Hide furniture sidebar"
                  aria-label="Hide furniture sidebar">
                  <PanelRightClose size={14} />
                </button>
                <FurniturePanel />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setFurnitureOpen(true)}
                className="editor-furniture-dock__toggle editor-furniture-dock__toggle--collapsed"
                title="Show furniture sidebar"
                aria-label="Show furniture sidebar">
                <PanelRightOpen size={14} />
                <span>Furniture</span>
              </button>
            )}
          </div>
        </div>

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