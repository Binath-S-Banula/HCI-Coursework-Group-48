import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Grid3X3, Keyboard, Loader2, Minus, PanelRightClose, PanelRightOpen, Plus, Save } from 'lucide-react'
import { setMode, setTool, toggleGrid, setZoom } from '../store/slices/editorSlice'
import Canvas2D from '../components/editor/Canvas2D'
import Canvas3D from '../components/editor/Canvas3D'
import EditorToolbar from '../components/editor/EditorToolbar'
import FurniturePanel from '../components/furniture/FurniturePanel'
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
  const { mode, zoom, showGrid } = useSelector(s => s.editor)

  const [project,       setProject]       = useState(null)
  const [projectName,   setProjectName]   = useState('New Project')
  const [renamingTitle, setRenamingTitle] = useState(false)
  const [furnitureOpen, setFurnitureOpen] = useState(true)
  const [isSaving,      setIsSaving]      = useState(false)
  const [lastSaved,     setLastSaved]     = useState(null)
  const [isDirty,       setIsDirty]       = useState(false)
  const [isHelpOpen,    setIsHelpOpen]    = useState(false)
  const [stats,         setStats]         = useState({ walls: 0, furniture: 0, openings: 0 })
  const [showWelcome,   setShowWelcome]   = useState(() => sessionStorage.getItem('editor-welcome-seen') !== '1')
  const [canvas3DSessionKey, setCanvas3DSessionKey] = useState(() => Date.now())
  const autoSaveTimer = useRef(null)
  const changeAutoSaveTimer = useRef(null)

  const refreshStats = useCallback(() => {
    setStats({
      walls: (window.__editorWalls || []).length,
      furniture: (window.__editorPlaced || []).length,
      openings: (window.__editorOpenings || []).length,
    })
  }, [])

  useEffect(() => {
    setCanvas3DSessionKey(Date.now())
    window.dispatchEvent(new Event('editor-3d-reset'))
  }, [projectId])

  useEffect(() => {
    const view = searchParams.get('view')
    if (view === '3d' || view === '2d') {
      dispatch(setMode(view))
    }
  }, [dispatch, searchParams])

  useEffect(() => {
    if (mode === '3d') {
      window.dispatchEvent(new Event('editor-state-change'))
    }
  }, [mode])

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
        setStats({
          walls: (proj.walls || []).length,
          furniture: (proj.placed || []).length,
          openings: (proj.openings || []).length,
        })
        setIsDirty(false)

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
  const captureThumb = async () => {
    try {
      // Enable screenshot mode via event to trigger React state update in Canvas3D
      window.dispatchEvent(new CustomEvent('screenshot-mode', { detail: { enabled: true } }))
      
      // Wait for multiple frames to ensure re-render and canvas update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const canvas = document.querySelector('.canvas3d-root canvas')
      let result = null
      if (canvas) result = canvas.toDataURL('image/jpeg', 0.5)
      
      // Disable screenshot mode
      window.dispatchEvent(new CustomEvent('screenshot-mode', { detail: { enabled: false } }))
      
      return result
    } catch {}
    return null
  }

  // ── Save ──────────────────────────────────────────────────────────
  const doSave = useCallback(async (silent = false) => {
    if (!projectId) return
    if (silent && !isDirty) return
    if (!silent) setIsSaving(true)

    const state = collectState()
    const capturedThumbnail = await captureThumb()
    const patch = {
      name: projectName,
      ...state,
      ...(capturedThumbnail ? { thumbnail: capturedThumbnail } : (project?.thumbnail ? { thumbnail: project.thumbnail } : {})),
    }
    projectService.update(projectId, patch)
      .then((saved) => {
        setProject(saved)
        setLastSaved(new Date())
        setIsDirty(false)
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
  }, [isDirty, projectId, projectName, project?.thumbnail])

  // ── Auto-save every 30s ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    autoSaveTimer.current = setInterval(() => {
      doSave(true)
    }, 30000)
    return () => {
      clearInterval(autoSaveTimer.current)
    }
  }, [projectId, doSave])

  // ── Auto-save shortly after any canvas state change ───────────────
  useEffect(() => {
    if (!projectId) return

    const handleEditorStateChange = () => {
      if (window.__editorRestoreSignal) return
      refreshStats()
      setIsDirty(true)
      clearTimeout(changeAutoSaveTimer.current)
      changeAutoSaveTimer.current = setTimeout(() => {
        doSave(true)
      }, 1500)
    }

    window.addEventListener('editor-state-change', handleEditorStateChange)
    return () => {
      window.removeEventListener('editor-state-change', handleEditorStateChange)
      clearTimeout(changeAutoSaveTimer.current)
    }
  }, [projectId, doSave, refreshStats])

  useEffect(() => {
    if (!showWelcome) return
    const timer = setTimeout(() => {
      setShowWelcome(false)
      sessionStorage.setItem('editor-welcome-seen', '1')
    }, 8000)
    return () => clearTimeout(timer)
  }, [showWelcome])

  useEffect(() => {
    const isTypingTarget = (event) => {
      const target = event.target
      if (!target) return false
      const tag = target.tagName?.toLowerCase()
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'
    }

    const handleShortcuts = (event) => {
      if (isTypingTarget(event)) return

      const key = String(event.key || '').toLowerCase()

      if (event.ctrlKey && key === 's') {
        event.preventDefault()
        doSave(false)
        return
      }

      if (key === 'tab') {
        event.preventDefault()
        dispatch(setMode(mode === '2d' ? '3d' : '2d'))
        return
      }

      if (key === '?') {
        event.preventDefault()
        setIsHelpOpen(prev => !prev)
        return
      }

      if (key === 'escape') {
        setIsHelpOpen(false)
        return
      }

      if (key === 'g' && mode === '2d') {
        event.preventDefault()
        dispatch(toggleGrid())
        return
      }

      const toolKeyMap = { v: 'select', w: 'wall', f: 'floor', d: 'door', n: 'window' }
      if (toolKeyMap[key] && mode === '2d') {
        dispatch(setTool(toolKeyMap[key]))
        return
      }

      if (mode === '2d') {
        if (key === '+' || key === '=') {
          dispatch(setZoom(zoom + 0.1))
          return
        }
        if (key === '-' || key === '_') {
          dispatch(setZoom(Math.max(0.1, zoom - 0.1)))
        }
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [dispatch, doSave, mode, zoom])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

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

          {isSaving && <span className="editor-save-state editor-save-state--saving">Saving…</span>}
          {!isSaving && isDirty && <span className="editor-save-state editor-save-state--dirty">Unsaved changes</span>}
          {lastSaved && !isSaving && !isDirty && (
            <span className="editor-save-state editor-save-state--saved">
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            onClick={() => setIsHelpOpen(prev => !prev)}
            className={`editor-topbar-btn ${isHelpOpen ? 'editor-topbar-btn--active' : ''}`}
            title="Shortcuts and guidance ( ? )">
            <Keyboard size={14} /> Shortcuts
          </button>
          <button
            onClick={() => doSave(false)} className="editor-topbar-btn editor-topbar-btn--save">
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
              <Canvas2D />
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
              <button className={`editor-topbar-btn ${showGrid ? 'editor-topbar-btn--active' : ''}`} onClick={() => dispatch(toggleGrid())}><Grid3X3 size={14} /> Grid</button>
            </div>
          )}

          {showWelcome && (
            <div className="editor-welcome-card" role="status" aria-live="polite">
              <div className="editor-welcome-card__title">Quick start</div>
              <div className="editor-welcome-card__line">Use W to draw walls, F to set floor, drag furniture from the right.</div>
              <div className="editor-welcome-card__line">Press ? any time for full shortcuts.</div>
              <button
                type="button"
                className="editor-welcome-card__dismiss"
                onClick={() => {
                  setShowWelcome(false)
                  sessionStorage.setItem('editor-welcome-seen', '1')
                }}>
                Dismiss
              </button>
            </div>
          )}

          {isHelpOpen && (
            <div className="editor-help-backdrop" onClick={() => setIsHelpOpen(false)}>
              <div
                className="editor-help-overlay"
                role="dialog"
                aria-modal="false"
                aria-label="Editor keyboard shortcuts"
                onClick={(e) => e.stopPropagation()}>
                <div className="editor-help-overlay__header">
                  <span><Keyboard size={14} /> Keyboard shortcuts</span>
                  <button type="button" onClick={() => setIsHelpOpen(false)}>Close</button>
                </div>
                <div className="editor-help-overlay__grid">
                  <p><strong>V</strong> Select</p>
                  <p><strong>W</strong> Wall</p>
                  <p><strong>F</strong> Floor</p>
                  <p><strong>D</strong> Door</p>
                  <p><strong>N</strong> Window</p>
                  <p><strong>Tab</strong> Toggle 2D/3D</p>
                  <p><strong>Ctrl+S</strong> Save now</p>
                  <p><strong>G</strong> Toggle grid (2D)</p>
                  <p><strong>+ / -</strong> Zoom in/out (2D)</p>
                  <p><strong>?</strong> Toggle this panel</p>
                </div>
              </div>
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

      </div>
    </div>
  )
}