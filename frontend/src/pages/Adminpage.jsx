import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  Grid3X3,
  Box,
  Globe,
  Image,
  CheckCircle2,
  Circle,
  X,
  Pencil,
  LogOut,
  Trash2,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react'
import { logout } from '../store/slices/authSlice'
import { furnitureService } from '../services/furniture.service'
import { projectService } from '../services/project.service'
import logoImage from '../uploads/homeland-logo-admin.png'
import '../styles/pages/AdminPage.css'

const CATS = ['sofa','chair','table','bed','storage','lighting','kitchen','bathroom','decor']
const MAX_MODEL_FILE_SIZE = 100 * 1024 * 1024
const NAV = [
  { id:'dashboard', icon: Grid3X3, label:'Dashboard' },
  { id:'furniture', icon: Box, label:'Furniture' },
  { id:'designs', icon: Globe, label:'Designs' },
]

function Field({ label, field, placeholder, type='text', obj, setObj }) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      <input type={type} value={obj[field]} placeholder={placeholder} onChange={e => setObj(p=>({...p,[field]:e.target.value}))} />
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const [page,    setPage]    = useState('dashboard')
  const [store,   setStore]   = useState({ furniture: [], projects: [] })
  const [form,    setForm]    = useState({ name:'', category:'sofa', price:'', width:'', depth:'' })
  const [preview, setPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [model3dFile, setModel3dFile] = useState(null)
  const [model3dName, setModel3dName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [furnitureSearch, setFurnitureSearch] = useState('')
  const [designsSearch, setDesignsSearch] = useState('')
  const [designsFilter, setDesignsFilter] = useState('all')
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    tone: 'danger',
    onConfirm: null,
  })
  const [msg,     setMsg]     = useState(null)
  const isEditing = Boolean(editingId)

  const mapFurniture = (item) => ({
    ...item,
    id: item._id || item.id,
    image: item.imageUrl || item.image,
  })

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 2500)
  }
  const readFile = (file, cb) => { const r = new FileReader(); r.onload = (e) => cb(e.target.result); r.readAsDataURL(file) }

  const openConfirm = ({ title, message, confirmText, tone = 'danger', onConfirm }) => {
    setConfirming(false)
    setConfirmModal({
      open: true,
      title,
      message,
      confirmText,
      tone,
      onConfirm,
    })
  }

  const closeConfirm = () => {
    if (confirming) return
    setConfirmModal({ open: false, title: '', message: '', confirmText: 'Confirm', tone: 'danger', onConfirm: null })
  }

  const executeConfirmedAction = async () => {
    if (!confirmModal.onConfirm || confirming) return
    setConfirming(true)
    await confirmModal.onConfirm()
    setConfirming(false)
  }

  const resetFurnitureForm = () => {
    setPreview(null)
    setImageFile(null)
    setModel3dFile(null)
    setModel3dName('')
    setEditingId(null)
    setForm({ name:'', category:'sofa', price:'', width:'', depth:'' })
  }

  const loadFurniture = async () => {
    try {
      const res = await furnitureService.getAll({ limit: 200 })
      const items = Array.isArray(res.data) ? res.data.map(mapFurniture) : []
      setStore((prev) => ({ ...prev, furniture: items }))
    } catch {
      flash('Failed to load furniture', 'error')
    }
  }

  const loadProjects = async () => {
    try {
      const items = await projectService.adminGetAll()
      setStore((prev) => ({ ...prev, projects: Array.isArray(items) ? items : [] }))
    } catch {
      flash('Failed to load designs', 'error')
    }
  }

  useEffect(() => {
    loadFurniture()
    loadProjects()
  }, [])

  const saveFurniture = async () => {
    if (!form.name)  return flash('Please enter a furniture name', 'error')

    if (!isEditing) {
      if (!imageFile)  return flash('Please upload a 2D furniture image', 'error')
      if (!model3dFile) return flash('Please upload a 3D model (.glb or .gltf)', 'error')
    }

    if (model3dFile && model3dFile.size > MAX_MODEL_FILE_SIZE) {
      return flash('3D model file must be 100MB or smaller', 'error')
    }

    try {
      const payload = new FormData()
      payload.append('name', form.name)
      payload.append('category', form.category)
      payload.append('price', String(+form.price || 0))
      payload.append('width', String(+form.width || 80))
      payload.append('depth', String(+form.depth || 80))

      if (imageFile) payload.append('image', imageFile)
      if (model3dFile) {
        payload.append('model3dFile', model3dFile)
        payload.append('model3dName', model3dName)
      }

      if (isEditing) {
        const updated = await furnitureService.update(editingId, payload)
        const item = mapFurniture(updated)
        setStore((prev) => ({
          ...prev,
          furniture: prev.furniture.map((f) => (f.id === item.id ? item : f)),
        }))
        resetFurnitureForm()
        flash('Furniture updated successfully')
      } else {
        const created = await furnitureService.create(payload)
        const item = mapFurniture(created)
        setStore((prev) => ({ ...prev, furniture: [item, ...prev.furniture] }))
        resetFurnitureForm()
        flash('Furniture added successfully')
      }
    } catch (err) {
      const message = err?.response?.data?.message || (isEditing ? 'Failed to update furniture' : 'Failed to add furniture')
      flash(message, 'error')
    }
  }

  const editFurniture = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      category: item.category || 'sofa',
      price: String(item.price ?? ''),
      width: String(item.width ?? ''),
      depth: String(item.depth ?? ''),
    })
    setPreview(item.image || null)
    setImageFile(null)
    setModel3dFile(null)
    setModel3dName(item.model3dName || '')
    flash(`Editing ${item.name}`)
  }

  const del = async (id) => {
    try {
      await furnitureService.delete(id)
      setStore((prev) => ({ ...prev, furniture: prev.furniture.filter((i) => i.id !== id) }))
      if (editingId === id) resetFurnitureForm()
      toast.success('Furniture deleted successfully')
      closeConfirm()
    } catch {
      flash('Failed to remove furniture', 'error')
    }
  }

  const requestDeleteFurniture = (item) => {
    openConfirm({
      title: 'Delete Furniture',
      message: <>
        Are you sure you want to delete <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{item?.name}</span>? This action cannot be undone.
      </>,
      confirmText: 'Delete',
      tone: 'danger',
      onConfirm: () => del(item.id),
    })
  }
  const handleLogout = () => { dispatch(logout()); navigate('/admin/login') }

  const toggleProjectVisibility = async (project) => {
    try {
      const updated = await projectService.adminSetVisibility(project._id, !project.isPublic)
      setStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p._id === project._id ? updated : p)),
      }))
      toast.success(updated.isPublic ? 'Project published successfully' : 'Project unpublished successfully')
      closeConfirm()
    } catch {
      flash('Failed to update design visibility', 'error')
    }
  }

  const requestToggleProjectVisibility = (project) => {
    const isPublishing = !project.isPublic
    openConfirm({
      title: isPublishing ? 'Publish Project' : 'Unpublish Project',
      message: <>
        {isPublishing
          ? <>Are you sure you want to publish <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{project?.name}</span> to the gallery?</>
          : <>Are you sure you want to unpublish <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{project?.name}</span> from the gallery?</>}
      </>,
      confirmText: isPublishing ? 'Publish' : 'Unpublish',
      tone: 'primary',
      onConfirm: () => toggleProjectVisibility(project),
    })
  }

  const deleteProject = async (id) => {
    try {
      await projectService.adminDelete(id)
      setStore((prev) => ({ ...prev, projects: prev.projects.filter((p) => p._id !== id) }))
      toast.success('Project deleted successfully')
      closeConfirm()
    } catch {
      flash('Failed to delete design', 'error')
    }
  }

  const requestDeleteProject = (project) => {
    openConfirm({
      title: 'Delete Project',
      message: <>
        Are you sure you want to delete <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{project?.name}</span>? This action cannot be undone.
      </>,
      confirmText: 'Delete',
      tone: 'danger',
      onConfirm: () => deleteProject(project._id),
    })
  }

  const Flash = () => !msg ? null : (
    <div className={`admin-flash ${msg.type === 'error' ? 'admin-flash--error' : 'admin-flash--success'}`}>{msg.text}</div>
  )

  const UploadBox = ({ preview, onFile, onClear, icon, label }) => (
    <div>
      <label className={`admin-upload-box ${preview ? 'admin-upload-box--filled' : ''}`}>
        {preview ? <img src={preview} alt="preview" /> : <><span className="admin-upload-box__icon">{icon}</span><span className="admin-upload-box__label">{label}</span></>}
        <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f); e.target.value='' }} />
      </label>
      {preview && <button className="admin-upload-clear" onClick={onClear}><X size={12} /> Remove</button>}
    </div>
  )

  const ItemCard = ({ item }) => (
    <div className="admin-item-card">
      <img src={item.image} alt={item.name} />
      <div className="admin-item-card__body">
        <div className="admin-item-card__name">{item.name}</div>
        <div className="admin-item-card__meta">
          {item.category}
          {item.model3d && <span style={{ marginLeft:6, fontSize:'0.6rem', background:'rgba(67,217,173,0.2)', color:'#43d9ad', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>3D</span>}
        </div>
      </div>
      <div className="admin-item-card__actions">
        <button className="admin-item-card__edit" onClick={() => editFurniture(item)}><Pencil size={10} /></button>
        <button className="admin-item-card__delete" onClick={() => requestDeleteFurniture(item)}><X size={10} /></button>
      </div>
    </div>
  )

  // ── Dashboard ──────────────────────────────────────────────────
  const DashboardView = () => (
    <div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:'1.75rem', marginBottom:'0.5rem', color:'#e8e8f0' }}>Dashboard</h2>
      <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9375rem', marginBottom:'2.5rem' }}>Welcome back, <span style={{ fontWeight: 600, color:'#a78bfa' }}>{user?.name}</span></p>
      <div className="admin-stats">
        {[
          { label:'Furniture',     value:store.furniture.length,                           icon: Box,       cls:'text-accent' },
          { label:'Designs',       value:store.projects.length,                            icon: Globe,     cls:'text-teal' },
          { label:'Published',     value:store.projects.filter(p => p.isPublic).length,   icon: Globe,     cls:'text-blue' },
        ].map(s => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-card__icon"><s.icon size={24} /></div>
            <div className={`admin-stat-card__value ${s.cls}`}>{s.value}</div>
            <div className="admin-stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:'2.5rem' }}>
        <div className="admin-section-header">
          <span className="admin-section-title">Recent Furniture</span>
          <button className="admin-section-link admin-section-link--purple" onClick={() => setPage('furniture')}>View all →</button>
        </div>
        {store.furniture.length === 0
          ? <div className="admin-empty">No furniture yet — <button className="admin-section-link admin-section-link--purple" onClick={() => setPage('furniture')}>Add some →</button></div>
          : <div className="admin-mini-grid">{store.furniture.slice(0,8).map(item => (
              <div key={item.id} className="admin-mini-card">
                <img src={item.image} alt={item.name} />
                <div className="admin-mini-card__label">{item.name}</div>
              </div>
            ))}</div>
        }
      </div>
    </div>
  )

  // ── Furniture ──────────────────────────────────────────────────
  const FurnitureView = () => {
    const filteredFurniture = store.furniture.filter(item =>
      item.name.toLowerCase().includes(furnitureSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(furnitureSearch.toLowerCase())
    )

    return (
      <div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:'1.75rem', marginBottom:'0.5rem', color:'#e8e8f0' }}>Furniture Catalog</h2>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9375rem', marginBottom:'2rem' }}>Manage and upload furniture items for your design catalog</p>
        <Flash />
        <div className="admin-page-grid">
          <div className="admin-form-card">
            <h3 style={{ color:'#e8e8f0', fontSize:'1.125rem' }}>{isEditing ? 'Edit Furniture Item' : '+ Add New Furniture'}</h3>

            {/* Step 1 — 2D Image */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:'0.75rem', fontWeight:700, color: preview ? '#43d9ad' : '#a78bfa', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:20, height:20, borderRadius:'50%', background: preview ? 'rgba(67,217,173,0.3)' : 'rgba(108,99,255,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, color: preview ? '#43d9ad' : '#a78bfa', flexShrink:0, fontWeight: 700 }}>{preview ? <CheckCircle2 size={12} /> : '1'}</span>
                2D Image ({isEditing ? 'optional' : 'required'})
              </div>
              <UploadBox
                preview={preview}
                onFile={(file) => {
                  setImageFile(file)
                  readFile(file, setPreview)
                }}
                onClear={() => {
                  setPreview(null)
                  setImageFile(null)
                }}
                icon={<Image size={32} />}
                label="Upload furniture image (.png / .jpg)"
              />
            </div>

            {/* Step 2 — 3D Model */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:'0.75rem', fontWeight:700, color: model3dFile ? '#43d9ad' : '#a78bfa', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:20, height:20, borderRadius:'50%', background: model3dFile ? 'rgba(67,217,173,0.3)' : 'rgba(108,99,255,0.3)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, color: model3dFile ? '#43d9ad' : '#a78bfa', flexShrink:0, fontWeight: 700 }}>{model3dFile ? <CheckCircle2 size={12} /> : '2'}</span>
                3D Model — .glb or .gltf ({isEditing ? 'optional' : 'required'})
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:10, border:`1px solid ${model3dFile ? 'rgba(67,217,173,0.4)' : 'rgba(108,99,255,0.2)'}`, background: model3dFile ? 'rgba(67,217,173,0.08)' : 'rgba(108,99,255,0.03)', cursor:'pointer', transition:'all .2s', position:'relative' }}>
                <Box size={24} color={model3dFile ? '#43d9ad' : '#a78bfa'} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.875rem', color: model3dFile ? '#43d9ad' : '#d4d4e4', fontWeight:600 }}>
                    {model3dFile ? `✓ ${model3dName}` : 'Click to upload .glb or .gltf'}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'#8888aa', marginTop:3 }}>
                    Max 100MB · Auto-scales to furniture size
                  </div>
                </div>
                {model3dFile && (
                  <button onClick={e => { e.preventDefault(); setModel3dFile(null); setModel3dName('') }}
                    style={{ fontSize:'0.75rem', color:'#fca5a5', background:'none', border:'none', cursor:'pointer', flexShrink:0, fontWeight: 600 }}><X size={14} /> Remove</button>
                )}
                <input type="file" accept=".glb,.gltf" style={{ display:'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (f.size > MAX_MODEL_FILE_SIZE) {
                      flash('3D model file must be 100MB or smaller', 'error')
                      e.target.value = ''
                      return
                    }
                    setModel3dName(f.name)
                    setModel3dFile(f)
                    e.target.value = ''
                  }} />
              </label>
            </div>

            {/* Status indicator */}
            <div style={{ display:'flex', gap:8, marginBottom:16, padding:'10px 12px', borderRadius:8, background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.15)' }}>
              <span style={{ fontSize:'0.75rem', fontWeight: 700, color: preview ? '#43d9ad' : '#6b7280', display:'inline-flex', alignItems:'center', gap:4 }}>{preview ? <CheckCircle2 size={12} /> : <Circle size={12} />} Image</span>
              <span style={{ color:'rgba(255,255,255,0.1)' }}>·</span>
              <span style={{ fontSize:'0.75rem', fontWeight: 700, color: model3dFile ? '#43d9ad' : '#6b7280', display:'inline-flex', alignItems:'center', gap:4 }}>{model3dFile ? <CheckCircle2 size={12} /> : <Circle size={12} />} Model</span>
              <span style={{ color:'rgba(255,255,255,0.1)' }}>·</span>
              <span style={{ fontSize:'0.75rem', fontWeight: 700, color: form.name ? '#43d9ad' : '#6b7280', display:'inline-flex', alignItems:'center', gap:4 }}>{form.name ? <CheckCircle2 size={12} /> : <Circle size={12} />} Name</span>
            </div>

            <Field label="Name *"     field="name"  placeholder="e.g. Modern Sofa" obj={form} setObj={setForm} />
            <Field label="Width (cm)" field="width" placeholder="120" type="number" obj={form} setObj={setForm} />
            <Field label="Depth (cm)" field="depth" placeholder="80"  type="number" obj={form} setObj={setForm} />
            <div className="admin-field">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <button className="admin-submit-purple" onClick={saveFurniture}
              style={{ opacity: ((isEditing ? form.name : (preview && model3dFile && form.name)) ? 1 : 0.5) }}>
              {isEditing ? '✓ Save Changes' : '+ Add Furniture'}
            </button>
            {isEditing && (
              <button className="admin-submit-purple" onClick={resetFurnitureForm}
                style={{ marginTop: 10, background: 'rgba(255,255,255,0.08)', color: '#e8e8f0' }}>
                ← Cancel Edit
              </button>
            )}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
              <div style={{ flex:1, position:'relative' }}>
                <Search size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', pointerEvents:'none' }} />
                <input 
                  type="text" 
                  placeholder="Search furniture..." 
                  value={furnitureSearch}
                  onChange={e => setFurnitureSearch(e.target.value)}
                  style={{
                    width:'100%',
                    padding:'0.75rem 0.75rem 0.75rem 2.5rem',
                    borderRadius:'0.875rem',
                    background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(108,99,255,0.2)',
                    color:'#e8e8f0',
                    fontSize:'0.9375rem',
                    outline:'none',
                    transition:'all 0.25s',
                    fontFamily:'"DM Sans", sans-serif'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(108,99,255,0.6)'
                    e.target.style.background = 'rgba(108,99,255,0.05)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.1)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(108,99,255,0.2)'
                    e.target.style.background = 'rgba(255,255,255,0.04)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              {furnitureSearch && (
                <button 
                  onClick={() => setFurnitureSearch('')}
                  style={{ background:'none', border:'none', color:'#a78bfa', cursor:'pointer', fontSize:'0.875rem', fontWeight:600 }}>
                  Clear
                </button>
              )}
            </div>
            <div className="admin-item-count">{filteredFurniture.length} furniture items{furnitureSearch ? ` (${store.furniture.length} total)` : ''}</div>
            {filteredFurniture.length === 0
              ? <div className="admin-empty">{furnitureSearch ? 'No furniture matches your search.' : 'No furniture added yet. Start by adding your first item.'}</div>
              : <div className="admin-items-grid">{filteredFurniture.map(item => <ItemCard key={item.id} item={item} />)}</div>
            }
          </div>
        </div>
      </div>
    )
  }

  const DesignsView = () => {
    let filteredProjects = store.projects.filter(project =>
      project.name.toLowerCase().includes(designsSearch.toLowerCase()) ||
      project.owner?.name?.toLowerCase().includes(designsSearch.toLowerCase()) ||
      project.owner?.email?.toLowerCase().includes(designsSearch.toLowerCase())
    )

    if (designsFilter === 'published') {
      filteredProjects = filteredProjects.filter(p => p.isPublic)
    } else if (designsFilter === 'unpublished') {
      filteredProjects = filteredProjects.filter(p => !p.isPublic)
    }

    return (
      <div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:'1.75rem', marginBottom:'0.5rem', color:'#e8e8f0' }}>Design Moderation</h2>
        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9375rem', marginBottom:'2rem' }}>Review and manage shared designs in the gallery</p>
        <Flash />
        
        <div style={{ display:'flex', gap:'1rem', alignItems:'center', marginBottom:'2rem', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:'250px', position:'relative' }}>
            <Search size={16} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)', pointerEvents:'none' }} />
            <input 
              type="text" 
              placeholder="Search by name or creator..." 
              value={designsSearch}
              onChange={e => setDesignsSearch(e.target.value)}
              style={{
                width:'100%',
                padding:'0.75rem 0.75rem 0.75rem 2.5rem',
                borderRadius:'0.875rem',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(108,99,255,0.2)',
                color:'#e8e8f0',
                fontSize:'0.9375rem',
                outline:'none',
                transition:'all 0.25s',
                fontFamily:'"DM Sans", sans-serif'
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(108,99,255,0.6)'
                e.target.style.background = 'rgba(108,99,255,0.05)'
                e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.1)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(108,99,255,0.2)'
                e.target.style.background = 'rgba(255,255,255,0.04)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ display:'flex', gap:'0.5rem' }}>
            {[
              { label:'All', value:'all' },
              { label:'Published', value:'published', icon:Eye },
              { label:'Unpublished', value:'unpublished', icon:EyeOff }
            ].map(filter => {
              const IconComponent = filter.icon
              const isActive = designsFilter === filter.value
              return (
                <button
                  key={filter.value}
                  onClick={() => setDesignsFilter(filter.value)}
                  style={{
                    padding:'0.75rem 1rem',
                    borderRadius:'0.75rem',
                    border:`1.5px solid ${isActive ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.2)'}`,
                    background: isActive ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize:'0.875rem',
                    cursor:'pointer',
                    transition:'all 0.25s',
                    display:'flex',
                    alignItems:'center',
                    gap:'0.5rem'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.target.style.borderColor = 'rgba(108,99,255,0.3)'
                      e.target.style.background = 'rgba(108,99,255,0.08)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                      e.target.style.background = 'rgba(255,255,255,0.04)'
                    }
                  }}
                >
                  {IconComponent && <IconComponent size={16} />}
                  {filter.label}
                </button>
              )
            })}
          </div>

          {(designsSearch || designsFilter !== 'all') && (
            <button 
              onClick={() => {
                setDesignsSearch('')
                setDesignsFilter('all')
              }}
              style={{ background:'none', border:'none', color:'#a78bfa', cursor:'pointer', fontSize:'0.875rem', fontWeight:600 }}>
              Clear filters
            </button>
          )}
        </div>

        <div className="admin-item-count">{filteredProjects.length} designs{(designsSearch || designsFilter !== 'all') ? ` (${store.projects.length} total)` : ''}</div>
        {filteredProjects.length === 0 ? (
          <div className="admin-empty">
            {designsSearch || designsFilter !== 'all' 
              ? 'No designs match your search or filter.' 
              : 'No designs found. When users share their projects, they will appear here for moderation.'}
          </div>
        ) : (
          <div className="admin-projects-list">
            {filteredProjects.map((project) => (
              <div key={project._id} className="admin-project-row">
                <div className="admin-project-row__left">
                  <div className="admin-project-row__thumb">
                    {project.thumbnail ? <img src={project.thumbnail} alt={project.name} /> : <Box size={18} />}
                  </div>
                  <div>
                    <div className="admin-project-row__name">{project.name}</div>
                    <div className="admin-project-row__meta">
                      by {project.owner?.name || project.owner?.email || 'Unknown'} · {(project.placed || []).length} items · {project.isPublic ? <span style={{ color:'#43d9ad', fontWeight:700 }}>Published</span> : <span style={{ color:'#a78bfa', fontWeight:700 }}>Unpublished</span>}
                    </div>
                  </div>
                </div>
                <div className="admin-project-row__actions">
                  <button
                    className={`admin-project-btn ${project.isPublic ? 'admin-project-btn--muted' : 'admin-project-btn--green'}`}
                    onClick={() => requestToggleProjectVisibility(project)}
                  >
                    <Globe size={13} /> {project.isPublic ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="admin-project-btn admin-project-btn--danger" onClick={() => requestDeleteProject(project)}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const currentNav = NAV.find(n => n.id === page)

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <img src={logoImage} alt="HomePlan3D Logo" className="admin-sidebar__logo-image" />
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__section-label">Menu</div>
          {NAV.map(item => {
            const active = page === item.id
            const count = item.id==='furniture' ? store.furniture.length : item.id==='designs' ? store.projects.length : null
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`admin-nav-btn ${active ? 'admin-nav-btn--active' : 'admin-nav-btn--inactive'}`}>
                <span className="admin-nav-btn__icon"><item.icon size={16} /></span>
                <span className="admin-nav-btn__label">{item.label}</span>
                {count > 0 && (
                  <span className="admin-nav-btn__badge admin-nav-btn__badge--purple">{count}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-info">
            <div className="admin-sidebar__avatar">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div>
              <div className="admin-sidebar__user-name">{user?.name}</div>
              <div className="admin-sidebar__user-role">Administrator</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">{currentNav?.icon && <currentNav.icon size={18} />} {currentNav?.label}</div>
          <div className="admin-topbar__sub">
            {page==='dashboard' && 'Overview of your catalog'}
            {page==='furniture' && 'Manage furniture items for clients'}
            {page==='designs' && 'Review shared projects and moderate gallery content'}
          </div>
        </header>
        <main className="admin-content">
          {page==='dashboard' && DashboardView()}
          {page==='furniture' && FurnitureView()}
          {page==='designs' && DesignsView()}
        </main>

        {confirmModal.open && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1201, background: 'rgba(5,5,12,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(2px)' }} role="dialog" aria-modal="true">
            <div style={{ width: '100%', maxWidth: 380, borderRadius: 16, border: '1px solid rgba(108,99,255,0.2)', background: 'rgba(19,19,31,0.9)', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'fadeInScale 0.3s ease-out' }}>
              <div style={{ color: '#e8e8f0', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{confirmModal.title}</div>
              <div style={{ marginBottom: 20, color: '#b0b0cc', fontSize: 13.5, lineHeight: 1.5 }}>{confirmModal.message}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeConfirm} disabled={confirming} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#a0a0b0', fontWeight: 700, fontSize: 13, padding: '10px 12px', cursor: confirming ? 'default' : 'pointer', transition: 'all 0.2s ease' }}>Cancel</button>
                <button
                  onClick={executeConfirmedAction}
                  disabled={confirming}
                  style={confirmModal.tone === 'danger'
                    ? { flex: 1, borderRadius: 8, border: '1px solid rgba(248,113,113,0.5)', background: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(248,113,113,0.1))', color: '#fca5a5', fontWeight: 700, fontSize: 13, padding: '10px 12px', cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.6 : 1, transition: 'all 0.2s ease' }
                    : { flex: 1, borderRadius: 8, border: '1px solid rgba(108,99,255,0.4)', background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(108,99,255,0.1))', color: '#c4b5fd', fontWeight: 700, fontSize: 13, padding: '10px 12px', cursor: confirming ? 'default' : 'pointer', opacity: confirming ? 0.6 : 1, transition: 'all 0.2s ease' }
                  }
                >
                  {confirming ? '...' : confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}