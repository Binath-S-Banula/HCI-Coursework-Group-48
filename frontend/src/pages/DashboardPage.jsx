import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import '../styles/pages/DashboardPage.css'

// ── Local storage helpers ─────────────────────────────────────────────
const LS_KEY = 'homeplan3d_projects'
const loadProjects  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const saveProjects  = (list) => localStorage.setItem(LS_KEY, JSON.stringify(list))

function genId() { return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2,7) }

// ── Sub-components ────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onRename }) {
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
          : <span>🏠</span>
        }
        <div className="project-card__overlay">
          <button className="project-card__overlay-btn project-card__overlay-btn--edit" onClick={onEdit}>Edit</button>
          <button className="project-card__overlay-btn project-card__overlay-btn--del"  onClick={onDelete}>Delete</button>
        </div>
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
            {project.wallCount || 0} walls
          </span>
          <span className="project-card__tag project-card__tag--teal">
            {project.furnitureCount || 0} items
          </span>
        </div>
      </div>
      <div className="project-card__actions">
        <button className="project-card__action project-card__action--edit" onClick={onEdit}>✏️ Open</button>
        <button className="project-card__action project-card__action--delete" onClick={onDelete}>🗑 Delete</button>
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

  // Load projects from localStorage on mount
  useEffect(() => {
    setLoading(true)
    const list = loadProjects()
    setProjects(list)
    setLoading(false)
  }, [])

  // Re-sync when the window gains focus (in case editor saved while page was open)
  useEffect(() => {
    const onFocus = () => setProjects(loadProjects())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const handleCreate = () => {
    const newProject = {
      id:             genId(),
      name:           'New Project',
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      thumbnail:      null,
      wallCount:      0,
      furnitureCount: 0,
      // canvas state — editor will populate these
      walls:          [],
      placed:         [],
      openings:       [],
      floorTex:       null,
      wallTex:        null,
    }
    const updated = [newProject, ...projects]
    saveProjects(updated)
    setProjects(updated)
    navigate(`/editor/${newProject.id}`)
  }

  const handleDelete = (id) => {
    setDeleting(id)
    setTimeout(() => {
      const updated = projects.filter(p => p.id !== id)
      saveProjects(updated)
      setProjects(updated)
      setDeleting(null)
      toast.success('Project deleted')
    }, 300)
  }

  const handleRename = (id, newName) => {
    const updated = projects.map(p =>
      p.id === id ? { ...p, name: newName, updatedAt: new Date().toISOString() } : p
    )
    saveProjects(updated)
    setProjects(updated)
  }

  const handleEdit = (project) => {
    navigate(`/editor/${project.id}`)
  }

  return (
    <div className="dashboard">
      <div className="dashboard__inner">

        {/* Header */}
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">My Projects</h1>
            <p className="dashboard__subtitle">Welcome back, {user?.name || 'Designer'} 👋</p>
          </div>
          <button className="dashboard__new-btn" onClick={handleCreate}>+ New Project</button>
        </div>

        {/* Plan badge */}
        <div className={`plan-badge plan-badge--${user?.plan || 'free'}`}>
          ★ {(user?.plan || 'free').charAt(0).toUpperCase() + (user?.plan || 'free').slice(1)} Plan
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
            <div className="dashboard-empty__icon">🏠</div>
            <h3 className="dashboard-empty__title">No projects yet</h3>
            <p className="dashboard-empty__sub">Start designing your dream home today</p>
            <button className="dashboard-empty__btn" onClick={handleCreate}>Create Your First Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {/* New project tile */}
            <button className="project-card project-card--new" onClick={handleCreate}>
              <span className="project-card--new-icon">+</span>
              <span className="project-card--new-label">New Project</span>
            </button>

            {projects.map(p => (
              <div key={p.id} style={{ opacity: deleting === p.id ? 0.4 : 1, transition: 'opacity 0.3s' }}>
                <ProjectCard
                  project={p}
                  onEdit={() => handleEdit(p)}
                  onDelete={() => handleDelete(p.id)}
                  onRename={(name) => handleRename(p.id, name)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}