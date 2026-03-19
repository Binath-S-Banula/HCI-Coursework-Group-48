import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Armchair, Box, CheckCircle2, Circle, Edit3, Globe, Home, Image as ImageIcon, Pencil, Plus, Search, Trash2, Waves, X } from 'lucide-react'
import { furnitureService } from '../services/furniture.service'
import { projectService } from '../services/project.service'
import '../styles/pages/DashboardPage.css'

const GRID = 10
const WORLD_COLS = 50
const WORLD_ROWS = 50
const MAJOR = GRID * 10
const WORLD_WIDTH = WORLD_COLS * MAJOR
const WORLD_HEIGHT = WORLD_ROWS * MAJOR
const MAX_MODEL_FILE_SIZE = 100 * 1024 * 1024
const FURNITURE_CATS = [
  { id: 'sofa', label: 'Sofa' },
  { id: 'chair', label: 'Chair' },
  { id: 'table', label: 'Table' },
  { id: 'bed', label: 'Bed' },
  { id: 'storage', label: 'Storage' },
  { id: 'lighting', label: 'Lights' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bathroom', label: 'Bath' },
  { id: 'decor', label: 'Decor' },
  { id: 'other', label: 'Other' },
]

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

function FurnitureCard({ item, onEdit, onDelete }) {
  return (
    <div className="dashboard-furniture-card">
      <div className="dashboard-furniture-card__thumb">
        {item.image ? <img src={item.image} alt={item.name} /> : <Armchair size={32} />}
        <span className="dashboard-furniture-card__mine">My</span>
      </div>
      <div className="dashboard-furniture-card__body">
        <div className="dashboard-furniture-card__name">{item.name}</div>
        <div className="dashboard-furniture-card__meta">{item.cat} • {item.w}×{item.d} cm</div>
        <div className="dashboard-furniture-card__actions">
          <button className="dashboard-furniture-card__btn dashboard-furniture-card__btn--edit" onClick={onEdit}><Pencil size={12} /> Edit</button>
          <button className="dashboard-furniture-card__btn dashboard-furniture-card__btn--delete" onClick={onDelete}><Trash2 size={12} /> Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [furnitureItems, setFurnitureItems] = useState([])
  const [furnitureLoading, setFurnitureLoading] = useState(false)
  const [isFurnitureModalOpen, setIsFurnitureModalOpen] = useState(false)
  const [furnitureEditingItem, setFurnitureEditingItem] = useState(null)
  const [furnitureDeleteTarget, setFurnitureDeleteTarget] = useState(null)
  const [furnitureSaving, setFurnitureSaving] = useState(false)
  const [furnitureDeleting, setFurnitureDeleting] = useState(false)
  const [furnitureForm, setFurnitureForm] = useState({ name: '', category: 'sofa', width: '', depth: '' })
  const [furniturePreview, setFurniturePreview] = useState(null)
  const [furnitureImageFile, setFurnitureImageFile] = useState(null)
  const [furnitureModelFile, setFurnitureModelFile] = useState(null)
  const [furnitureModelName, setFurnitureModelName] = useState('')
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const readAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const mapFurnitureItem = useCallback((item) => {
    const defaults = defaultSizeByCategory(item.category)
    const ownerId = typeof item.uploadedBy === 'string' ? item.uploadedBy : String(item.uploadedBy?._id || '')
    const isMine = String(user?._id || '') === ownerId && item.visibility === 'private'
    return {
      id: item._id,
      name: item.name,
      cat: item.category,
      w: Math.round(normalizeSizeCm(item.width, defaults.width)),
      d: Math.round(normalizeSizeCm(item.depth, defaults.depth)),
      image: item.imageUrl || null,
      model3d: item.model3d || null,
      model3dName: item.model3dName || '',
      isMine,
    }
  }, [user?._id])

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
    const x = snap((WORLD_WIDTH / 2) - (width / 2))
    const y = snap((WORLD_HEIGHT / 2) - (depth / 2))

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

  const loadMyFurniture = useCallback(async () => {
    setFurnitureLoading(true)
    try {
      const res = await furnitureService.getAll({ limit: 500, includeMine: true })
      const mapped = (res.data || []).map(mapFurnitureItem).filter((item) => item.isMine)
      setFurnitureItems(mapped)
    } catch {
      toast.error('Failed to load furniture')
    } finally {
      setFurnitureLoading(false)
    }
  }, [mapFurnitureItem])

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

  useEffect(() => {
    if (activeTab !== 'furniture') return
    loadMyFurniture()
  }, [activeTab, loadMyFurniture])

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

  const openAddFurnitureModal = () => {
    setFurnitureEditingItem(null)
    setFurnitureForm({ name: '', category: 'sofa', width: '', depth: '' })
    setFurniturePreview(null)
    setFurnitureImageFile(null)
    setFurnitureModelFile(null)
    setFurnitureModelName('')
    setIsFurnitureModalOpen(true)
  }

  const openEditFurnitureModal = (item) => {
    setFurnitureEditingItem(item)
    setFurnitureForm({
      name: item.name || '',
      category: item.cat || 'sofa',
      width: String(item.w || ''),
      depth: String(item.d || ''),
    })
    setFurniturePreview(item.image || null)
    setFurnitureImageFile(null)
    setFurnitureModelFile(null)
    setFurnitureModelName(item.model3dName || '')
    setIsFurnitureModalOpen(true)
  }

  const closeFurnitureModal = () => {
    setIsFurnitureModalOpen(false)
    setFurnitureEditingItem(null)
  }

  const saveFurniture = async () => {
    if (!furnitureForm.name.trim()) {
      toast.error('Please enter furniture name')
      return
    }

    const isEditing = Boolean(furnitureEditingItem)
    if (!isEditing && !furnitureImageFile) {
      toast.error('Please upload a 2D image')
      return
    }

    if (!isEditing && !furnitureModelFile) {
      toast.error('Please upload a 3D model')
      return
    }

    if (furnitureModelFile && furnitureModelFile.size > MAX_MODEL_FILE_SIZE) {
      toast.error('3D model file must be 100MB or smaller')
      return
    }

    try {
      setFurnitureSaving(true)
      const payload = new FormData()
      payload.append('name', furnitureForm.name.trim())
      payload.append('category', furnitureForm.category)
      payload.append('price', '0')
      payload.append('width', String(Number(furnitureForm.width) || 80))
      payload.append('depth', String(Number(furnitureForm.depth) || 80))
      if (furnitureImageFile) payload.append('image', furnitureImageFile)
      if (furnitureModelFile) {
        payload.append('model3dFile', furnitureModelFile)
        payload.append('model3dName', furnitureModelName)
      }

      if (isEditing) {
        await furnitureService.update(furnitureEditingItem.id, payload)
        toast.success('Furniture updated')
      } else {
        await furnitureService.create(payload)
        toast.success('Furniture added')
      }

      closeFurnitureModal()
      await loadMyFurniture()
    } catch (err) {
      toast.error(err?.response?.data?.message || (furnitureEditingItem ? 'Failed to update furniture' : 'Failed to add furniture'))
    } finally {
      setFurnitureSaving(false)
    }
  }

  const confirmDeleteFurniture = async () => {
    if (!furnitureDeleteTarget) return
    try {
      setFurnitureDeleting(true)
      await furnitureService.delete(furnitureDeleteTarget.id)
      setFurnitureDeleteTarget(null)
      toast.success('Furniture deleted')
      await loadMyFurniture()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete furniture')
    } finally {
      setFurnitureDeleting(false)
    }
  }

  const openDeleteConfirm = (project) => {
    setConfirmAction({ type: 'delete', project })
  }

  const openShareConfirm = (project) => {
    setConfirmAction({ type: project.isPublic ? 'unshare' : 'share', project })
  }

  const closeConfirm = () => {
    setConfirmAction(null)
  }

  const confirmAndRunAction = async () => {
    if (!confirmAction?.project) return

    const { type, project } = confirmAction
    closeConfirm()

    if (type === 'delete') {
      handleDelete(project._id)
      return
    }

    await handleTogglePublic(project)
  }

  const confirmTitle = confirmAction?.type === 'delete'
    ? 'Delete project?'
    : confirmAction?.type === 'unshare'
      ? 'Unshare project?'
      : 'Share project?'

  const confirmMessage = confirmAction?.type === 'delete'
    ? `This will permanently delete "${confirmAction?.project?.name}".`
    : confirmAction?.type === 'unshare'
      ? `"${confirmAction?.project?.name}" will be removed from the gallery.`
      : `"${confirmAction?.project?.name}" will be visible in the gallery.`

  const confirmButtonLabel = confirmAction?.type === 'delete'
    ? 'Delete'
    : confirmAction?.type === 'unshare'
      ? 'Unshare'
      : 'Share'

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <div className="dashboard">
      <div className="dashboard__inner">

        {/* Header */}
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__title">{activeTab === 'projects' ? 'My Projects' : 'My Furniture'}</h1>
            <p className="dashboard__subtitle">Welcome back, {user?.name || 'Designer'} <Waves size={14} strokeWidth={2} /></p>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === 'projects' ? 'dashboard-tab--active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            My Projects
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'furniture' ? 'dashboard-tab--active' : ''}`}
            onClick={() => setActiveTab('furniture')}
          >
            My Furniture
          </button>
        </div>

        {activeTab === 'projects' && !loading && projects.length > 0 && (
          <div className="dashboard-search-wrap">
            <span className="dashboard-search-icon" aria-hidden="true"><Search size={14} strokeWidth={2.1} /></span>
            <input
              className="dashboard-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
            />
          </div>
        )}

        {activeTab === 'projects' ? (
          loading ? (
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
          ) : filteredProjects.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty__icon"><Search size={48} strokeWidth={1.7} /></div>
              <h3 className="dashboard-empty__title">No matching projects</h3>
              <p className="dashboard-empty__sub">Try a different project name</p>
            </div>
          ) : (
            <div className="projects-grid">
              <button className="project-card project-card--new" onClick={handleCreate}>
                <span className="project-card--new-icon"><Plus size={28} strokeWidth={2.5} /></span>
                <span className="project-card--new-label">New Project</span>
              </button>

              {filteredProjects.map(p => (
                <div key={p._id} style={{ opacity: deleting === p._id ? 0.4 : 1, transition: 'opacity 0.3s' }}>
                  <ProjectCard
                    project={p}
                    onEdit={() => handleEdit(p)}
                    onTogglePublic={() => openShareConfirm(p)}
                    onDelete={() => openDeleteConfirm(p)}
                    onRename={(name) => handleRename(p._id, name)}
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="dashboard-furniture-head">
              <div className="dashboard-furniture-count">{furnitureItems.length} furniture item{furnitureItems.length !== 1 ? 's' : ''}</div>
              <button className="dashboard-furniture-add-btn" onClick={openAddFurnitureModal}>
                <Plus size={14} /> Add Furniture
              </button>
            </div>

            {furnitureLoading ? (
              <div className="projects-grid">
                {[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}
              </div>
            ) : furnitureItems.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty__icon"><Armchair size={52} strokeWidth={1.7} /></div>
                <h3 className="dashboard-empty__title">No furniture yet</h3>
                <p className="dashboard-empty__sub">Add your own furniture and use it in the editor</p>
                <button className="dashboard-empty__btn" onClick={openAddFurnitureModal}>Add Furniture</button>
              </div>
            ) : (
              <div className="dashboard-furniture-grid">
                {furnitureItems.map((item) => (
                  <FurnitureCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEditFurnitureModal(item)}
                    onDelete={() => setFurnitureDeleteTarget(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {isFurnitureModalOpen && (
          <div className="dashboard-confirm" onClick={closeFurnitureModal}>
            <div className="dashboard-furniture-modal" onClick={(event) => event.stopPropagation()}>
              <div className="dashboard-furniture-modal__head">
                <h3 className="dashboard-confirm__title" style={{ margin: 0 }}>{furnitureEditingItem ? 'Edit My Furniture' : 'Add My Furniture'}</h3>
                <button className="dashboard-furniture-modal__close" onClick={closeFurnitureModal}><X size={14} /></button>
              </div>

              <div className="dashboard-furniture-upload-wrap">
                <div className="dashboard-furniture-step-label">
                  <span className="dashboard-furniture-step-dot">{furniturePreview ? <CheckCircle2 size={10} /> : '1'}</span>
                  2D Image ({furnitureEditingItem ? 'optional' : 'required'})
                </div>
                <label className="dashboard-furniture-upload-box">
                  {furniturePreview ? <img src={furniturePreview} alt="Furniture preview" className="dashboard-furniture-upload-img" /> : <><ImageIcon size={20} /><span>Upload image (.png / .jpg)</span></>}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setFurnitureImageFile(file)
                      const nextPreview = await readAsDataUrl(file)
                      setFurniturePreview(nextPreview)
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>

              <div className="dashboard-furniture-upload-wrap">
                <div className="dashboard-furniture-step-label">
                  <span className="dashboard-furniture-step-dot">{furnitureModelFile ? <CheckCircle2 size={10} /> : '2'}</span>
                  3D Model ({furnitureEditingItem ? 'optional' : 'required'})
                </div>
                <label className="dashboard-furniture-model-box">
                  <Box size={18} />
                  <div style={{ flex: 1 }}>
                    <div className="dashboard-furniture-model-name">{furnitureModelName || 'Upload .glb or .gltf'}</div>
                    <div className="dashboard-furniture-model-help">Max 100MB</div>
                  </div>
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      if (file.size > MAX_MODEL_FILE_SIZE) {
                        toast.error('3D model file must be 100MB or smaller')
                        event.target.value = ''
                        return
                      }
                      setFurnitureModelFile(file)
                      setFurnitureModelName(file.name)
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>

              <div className="dashboard-furniture-status-row">
                <span>{furniturePreview ? <CheckCircle2 size={10} /> : <Circle size={10} />} 2D</span>
                <span>{furnitureModelFile ? <CheckCircle2 size={10} /> : <Circle size={10} />} 3D</span>
                <span>{furnitureForm.name ? <CheckCircle2 size={10} /> : <Circle size={10} />} Name</span>
              </div>

              <div className="dashboard-furniture-fields">
                <label>Name
                  <input value={furnitureForm.name} onChange={(event) => setFurnitureForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Reading Chair" />
                </label>
                <label>Category
                  <select value={furnitureForm.category} onChange={(event) => setFurnitureForm((prev) => ({ ...prev, category: event.target.value }))}>
                    {FURNITURE_CATS.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </label>
                <div className="dashboard-furniture-dims">
                  <label>Width (cm)
                    <input type="number" value={furnitureForm.width} onChange={(event) => setFurnitureForm((prev) => ({ ...prev, width: event.target.value }))} placeholder="80" />
                  </label>
                  <label>Depth (cm)
                    <input type="number" value={furnitureForm.depth} onChange={(event) => setFurnitureForm((prev) => ({ ...prev, depth: event.target.value }))} placeholder="80" />
                  </label>
                </div>
              </div>

              <div className="dashboard-confirm__actions" style={{ marginTop: 14 }}>
                <button className="dashboard-confirm__btn dashboard-confirm__btn--cancel" onClick={closeFurnitureModal}>Cancel</button>
                <button className="dashboard-confirm__btn dashboard-confirm__btn--primary" onClick={saveFurniture} disabled={furnitureSaving}>
                  {furnitureSaving ? 'Saving...' : (furnitureEditingItem ? 'Save Changes' : 'Add Furniture')}
                </button>
              </div>
            </div>
          </div>
        )}

        {furnitureDeleteTarget && (
          <div className="dashboard-confirm" onClick={() => setFurnitureDeleteTarget(null)}>
            <div className="dashboard-confirm__modal" onClick={(event) => event.stopPropagation()}>
              <h3 className="dashboard-confirm__title">Delete furniture?</h3>
              <p className="dashboard-confirm__message">This will permanently delete "{furnitureDeleteTarget.name}".</p>
              <div className="dashboard-confirm__actions">
                <button className="dashboard-confirm__btn dashboard-confirm__btn--cancel" onClick={() => setFurnitureDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="dashboard-confirm__btn dashboard-confirm__btn--danger" onClick={confirmDeleteFurniture} disabled={furnitureDeleting}>
                  {furnitureDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmAction && (
          <div className="dashboard-confirm" onClick={closeConfirm}>
            <div className="dashboard-confirm__modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="dashboard-confirm__title">{confirmTitle}</h3>
              <p className="dashboard-confirm__message">{confirmMessage}</p>
              <div className="dashboard-confirm__actions">
                <button className="dashboard-confirm__btn dashboard-confirm__btn--cancel" onClick={closeConfirm}>
                  Cancel
                </button>
                <button
                  className={`dashboard-confirm__btn dashboard-confirm__btn--${confirmAction.type === 'delete' ? 'danger' : 'primary'}`}
                  onClick={confirmAndRunAction}
                >
                  {confirmButtonLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}