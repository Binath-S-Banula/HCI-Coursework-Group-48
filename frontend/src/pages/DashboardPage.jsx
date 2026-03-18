import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Edit3, Globe, Home, Pencil, Plus, Sparkles, Trash2, Waves } from 'lucide-react'
import { projectService } from '../services/project.service'
import '../styles/pages/DashboardPage.css'

const GRID = 10
const DEFAULT_CANVAS_WIDTH = 900
const DEFAULT_CANVAS_HEIGHT = 550

const snap = (value) => Math.round(Number(value || 0) / GRID) * GRID

const defaultSizeByCategory = (category = '') => {
  const key = String(category || '').toLowerCase()
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

const normalizeSizeCm = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  if (parsed <= 12) return parsed * 100
  if (parsed > 1000) return parsed / 10
  return parsed
}

// ── Sub-components ────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onRename, onTogglePublic }) {
  const [renaming, setRenaming] = useState(false)
  const [name,     setName]     = useState(project.name)

  const commitRename = () => {
    if (name.trim()) onRename(name.trim())
    setRenaming(false)
  }

  return (
    <div className="project-card">
      <div className="project-card__thumb">
        {project.thumbnail
          ? <img src={project.thumbnail} alt={project.name} />
          : <Home size={44} strokeWidth={1.9} />
        }
        {project.isPublic && (
          <div className="project-card__public-badge">
            <Globe size={11} /> Public
          </div>
        )}
      </div>
      <div className="project-card__body">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(108,99,255,0.4)', borderRadius:6, color:'#e8e8f0', padding:'4px 8px', fontSize:14, outline:'none' }}
          />
        ) : (
          <div className="project-card__name" onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
            {project.name}
          </div>
        )}
        <div className="project-card__date">
          {new Date(project.updatedAt).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}
        </div>
        <div className="project-card__tags">
          <span className="project-card__tag project-card__tag--purple">
            {(project.walls || []).length} walls
          </span>
          <span className="project-card__tag project-card__tag--teal">
            {(project.placed || []).length} items
          </span>
        </div>
      </div>
      <div className="project-card__actions">
        <button className="project-card__action project-card__action--edit" onClick={onEdit}><Pencil size={13} /> Open</button>
        <button className="project-card__action project-card__action--rename" onClick={() => setRenaming(true)}><Edit3 size={13} /> Rename</button>
        <button
          className={`project-card__action ${project.isPublic ? 'project-card__action--unshare' : 'project-card__action--share'}`}
          onClick={onTogglePublic}
        >
          <Globe size={13} /> {project.isPublic ? 'Unshare' : 'Share'}
        </button>
        <button className="project-card__action project-card__action--delete" onClick={onDelete}><Trash2 size={13} /> Delete</button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="project-skeleton">
      <div className="skeleton-thumb skeleton" />
      <div className="skeleton-body">
        <div className="skeleton-line skeleton" style={{ height:18, width:'65%' }} />
        <div className="skeleton-line skeleton" style={{ height:12, width:'40%' }} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)

  const readPendingFurniture = () => {
    try {
      const raw = localStorage.getItem('homeplan3d_pendingFurniture')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed && parsed.name ? parsed : null
    } catch {
      return null
    }
  }

  const clearPendingFurniture = () => {
    localStorage.removeItem('homeplan3d_pendingFurniture')
  }

  const buildPlacedItem = (pendingItem) => {
    const defaults = defaultSizeByCategory(pendingItem.category || pendingItem.name)
    const width = Math.max(GRID, snap(normalizeSizeCm(pendingItem.width, defaults.width)))
    const depth = Math.max(GRID, snap(normalizeSizeCm(pendingItem.depth, defaults.depth)))
    const x = snap((DEFAULT_CANVAS_WIDTH / 2) - (width / 2))
    const y = snap((DEFAULT_CANVAS_HEIGHT / 2) - (depth / 2))

    return {
      id: `pf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      name: pendingItem.name,
      category: pendingItem.category,
      image: pendingItem.image || null,
      model3d: pendingItem.model3d || null,
      w: width,
      h: depth,
      x,
      y,
      angle: 0,
      color: pendingItem.color || '#8b6b4a',
    }
  }

  const openProjectWithPendingItem = async (project) => {
    const pending = readPendingFurniture()
    if (!pending) {
      navigate(`/editor/${project._id}`)
      return
    }

    try {
      const placedItem = buildPlacedItem(pending)
      await projectService.update(project._id, {
        placed: [...(project.placed || []), placedItem],
      })
      clearPendingFurniture()
      navigate(`/editor/${project._id}?view=2d`)
    } catch {
      toast.error('Failed to add furniture to project')
      navigate(`/editor/${project._id}`)
    }
  }

  const loadProjects = async () => {
    setLoading(true)
    try {
      const list = await projectService.getAll()
      setProjects(list)
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  // Load projects from API on mount
  useEffect(() => {
    loadProjects()
  }, [])

  // Re-sync when the window gains focus
  useEffect(() => {
    const onFocus = () => loadProjects()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const handleCreate = async () => {
    try {
      const pending = readPendingFurniture()
      const baseName = pending?.name ? `${pending.name} Project` : 'New Project'
      const newProject = await projectService.create({ name: baseName })

      if (pending) {
        const placedItem = buildPlacedItem(pending)
        const updatedProject = await projectService.update(newProject._id, {
          walls: [],
          openings: [],
          placed: [placedItem],
        })
        setProjects((prev) => [updatedProject, ...prev])
        clearPendingFurniture()
        navigate(`/editor/${updatedProject._id}?view=2d`)
        return
      }

      setProjects((prev) => [newProject, ...prev])
      navigate(`/editor/${newProject._id}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  const handleDelete = (id) => {
    setDeleting(id)
    setTimeout(async () => {
      try {
        await projectService.delete(id)
        setProjects((prev) => prev.filter(p => p._id !== id))
        toast.success('Project deleted')
      } catch {
        toast.error('Failed to delete project')
      } finally {
        setDeleting(null)
      }
    }, 300)
  }

  const handleRename = async (id, newName) => {
    try {
      const updatedProject = await projectService.update(id, { name: newName })
      setProjects((prev) => prev.map(p => (p._id === id ? updatedProject : p)))
    } catch {
      toast.error('Failed to rename project')
    }
  }

  const handleEdit = async (project) => {
    await openProjectWithPendingItem(project)
  }

  const handleTogglePublic = async (project) => {
    try {
      const updatedProject = await projectService.update(project._id, { isPublic: !project.isPublic })
      setProjects((prev) => prev.map(p => (p._id === project._id ? updatedProject : p)))
      toast.success(updatedProject.isPublic ? 'Project shared to gallery' : 'Project removed from gallery')
    } catch {
      toast.error('Failed to update sharing')
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard__inner">

        {/* Header */}
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">My Projects</h1>
            <p className="dashboard__subtitle">Welcome back, {user?.name || 'Designer'} <Waves size={14} strokeWidth={2} /></p>
          </div>
        </div>

        {/* Plan badge */}
        <div className={`plan-badge plan-badge--${user?.plan || 'free'}`}>
          <Sparkles size={12} strokeWidth={2} /> {(user?.plan || 'free').charAt(0).toUpperCase() + (user?.plan || 'free').slice(1)} Plan
          {(!user?.plan || user?.plan === 'free') && (
            <span style={{ color:'#6b7280', fontWeight:400 }}> — {projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="projects-grid">
            {[...Array(6)].map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty__icon"><Home size={58} strokeWidth={1.7} /></div>
            <h3 className="dashboard-empty__title">No projects yet</h3>
            <p className="dashboard-empty__sub">Start designing your dream home today</p>
            <button className="dashboard-empty__btn" onClick={handleCreate}>Create Your First Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {/* New project tile */}
            <button className="project-card project-card--new" onClick={handleCreate}>
              <span className="project-card--new-icon"><Plus size={28} strokeWidth={2.5} /></span>
              <span className="project-card--new-label">New Project</span>
            </button>

            {projects.map(p => (
              <div key={p._id} style={{ opacity: deleting === p._id ? 0.4 : 1, transition: 'opacity 0.3s' }}>
                <ProjectCard
                  project={p}
                  onEdit={() => handleEdit(p)}
                  onTogglePublic={() => handleTogglePublic(p)}
                  onDelete={() => handleDelete(p._id)}
                  onRename={(name) => handleRename(p._id, name)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}