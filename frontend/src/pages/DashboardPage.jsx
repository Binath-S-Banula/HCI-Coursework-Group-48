import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Home, Pencil, Plus, Sparkles, Trash2, Waves } from 'lucide-react'
import { projectService } from '../services/project.service'
import '../styles/pages/DashboardPage.css'

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
          : <Home size={44} strokeWidth={1.9} />
        }
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
      const newProject = await projectService.create({ name: 'New Project' })
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

  const handleEdit = (project) => {
    navigate(`/editor/${project._id}`)
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