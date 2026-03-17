import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Grid3X3,
  Box,
  Image,
  CheckCircle2,
  Circle,
  X,
  Settings,
  LogOut,
} from 'lucide-react'
import { logout } from '../store/slices/authSlice'
import '../styles/pages/AdminPage.css'

const getStore = () => JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[],"textures":[]}')
const saveStore = (data) => localStorage.setItem('adminAssets', JSON.stringify(data))
const CATS = ['sofa','chair','table','bed','storage','lighting','kitchen','bathroom','decor']
const NAV = [
  { id:'dashboard', icon: Grid3X3, label:'Dashboard' },
  { id:'furniture', icon: Box, label:'Furniture' },
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
  const [store,   setStore]   = useState(getStore)
  const [form,    setForm]    = useState({ name:'', category:'sofa', price:'', width:'', depth:'' })
  const [preview, setPreview] = useState(null)
  const [model3d, setModel3d] = useState(null)   // base64 GLB/GLTF
  const [model3dName, setModel3dName] = useState('')
  const [msg,     setMsg]     = useState(null)

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 2500)
  }
  const readFile = (file, cb) => { const r = new FileReader(); r.onload = (e) => cb(e.target.result); r.readAsDataURL(file) }

  const addFurniture = () => {
    if (!preview)    return flash('Please upload a 2D furniture image', 'error')
    if (!model3d)    return flash('Please upload a 3D model (.glb or .gltf)', 'error')
    if (!form.name)  return flash('Please enter a furniture name', 'error')
    const item = {
      id:`f_${Date.now()}`, ...form,
      price:+form.price||0, width:+form.width||80, depth:+form.depth||80,
      image:preview,
      model3d: model3d,
      model3dName: model3dName,
      addedAt:new Date().toISOString()
    }
    const next = { ...store, furniture:[item,...store.furniture] }
    saveStore(next); setStore(next)
    setPreview(null); setModel3d(null); setModel3dName('')
    setForm({ name:'', category:'sofa', price:'', width:'', depth:'' })
    flash('Furniture added successfully')
  }
  const del = (section, id) => { const next = { ...store, [section]:store[section].filter(i=>i.id!==id) }; saveStore(next); setStore(next) }
  const handleLogout = () => { dispatch(logout()); navigate('/admin/login') }

  const Flash = () => !msg ? null : (
    <div className={`admin-flash ${msg.type === 'error' ? 'admin-flash--error' : 'admin-flash--success'}`}>{msg.text}</div>
  )

  const UploadBox = ({ preview, onFile, onClear, icon, label }) => (
    <div>
      <label className={`admin-upload-box ${preview ? 'admin-upload-box--filled' : ''}`}>
        {preview ? <img src={preview} alt="preview" /> : <><span className="admin-upload-box__icon">{icon}</span><span className="admin-upload-box__label">{label}</span></>}
        <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) readFile(f,onFile); e.target.value='' }} />
      </label>
      {preview && <button className="admin-upload-clear" onClick={onClear}><X size={12} /> Remove</button>}
    </div>
  )

  const ItemCard = ({ item, section }) => (
    <div className="admin-item-card">
      <img src={item.image} alt={item.name} />
      <div className="admin-item-card__body">
        <div className="admin-item-card__name">{item.name}</div>
        <div className="admin-item-card__meta">
          {item.category}
          {item.model3d && <span style={{ marginLeft:6, fontSize:'0.6rem', background:'rgba(67,217,173,0.2)', color:'#43d9ad', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>3D</span>}
        </div>
      </div>
      <button className="admin-item-card__delete" onClick={() => del(section, item.id)}><X size={10} /></button>
    </div>
  )

  // ── Dashboard ──────────────────────────────────────────────────
  const DashboardView = () => (
    <div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:'1.375rem', marginBottom:'0.25rem' }}>Dashboard</h2>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.875rem', marginBottom:'2rem' }}>Welcome back, {user?.name}</p>
      <div className="admin-stats">
        {[
          { label:'Furniture',     value:store.furniture.length,                           icon: Box,       cls:'text-accent' },
        ].map(s => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-card__icon"><s.icon size={22} /></div>
            <div className={`admin-stat-card__value ${s.cls}`}>{s.value}</div>
            <div className="admin-stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:'2rem' }}>
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
  const FurnitureView = () => (
    <div>
      <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:'1.375rem', marginBottom:'1.5rem' }}>Furniture Catalog</h2>
      <Flash />
      <div className="admin-page-grid">
        <div className="admin-form-card">
          <h3>+ Add Furniture</h3>

          {/* Step 1 — 2D Image */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:'0.7rem', fontWeight:700, color: preview ? '#43d9ad' : '#9b95ff', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:16, height:16, borderRadius:'50%', background: preview ? '#43d9ad' : 'rgba(108,99,255,0.5)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', flexShrink:0 }}>{preview ? <CheckCircle2 size={10} /> : '1'}</span>
              2D Image (required)
            </div>
            <UploadBox preview={preview} onFile={setPreview} onClear={() => setPreview(null)} icon={<Image size={28} />} label="Upload furniture image (.png / .jpg)" />
          </div>

          {/* Step 2 — 3D Model */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:'0.7rem', fontWeight:700, color: model3d ? '#43d9ad' : '#9b95ff', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:16, height:16, borderRadius:'50%', background: model3d ? '#43d9ad' : 'rgba(108,99,255,0.5)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', flexShrink:0 }}>{model3d ? <CheckCircle2 size={10} /> : '2'}</span>
              3D Model — .glb or .gltf (required)
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:10, padding:'12px', borderRadius:10, border:`1px solid ${model3d ? 'rgba(67,217,173,0.5)' : 'rgba(255,255,255,0.1)'}`, background: model3d ? 'rgba(67,217,173,0.06)' : 'rgba(255,255,255,0.03)', cursor:'pointer', transition:'all .15s' }}>
              <Box size={22} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, color: model3d ? '#43d9ad' : '#777', fontWeight:600 }}>
                  {model3d ? model3dName : 'Click to upload .glb or .gltf'}
                </div>
                <div style={{ fontSize:10, color:'#444', marginTop:2 }}>
                  Max ~20MB · auto-scales to furniture size in 3D view
                </div>
              </div>
              {model3d && (
                <button onClick={e => { e.preventDefault(); setModel3d(null); setModel3dName('') }}
                  style={{ fontSize:10, color:'#ff6b6b', background:'none', border:'none', cursor:'pointer', flexShrink:0 }}><X size={12} /> Remove</button>
              )}
              <input type="file" accept=".glb,.gltf" style={{ display:'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setModel3dName(f.name)
                  const r = new FileReader()
                  r.onload = ev => setModel3d(ev.target.result)
                  r.readAsDataURL(f)
                  e.target.value = ''
                }} />
            </label>
          </div>

          {/* Status indicator */}
          <div style={{ display:'flex', gap:8, marginBottom:12, padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize:10, color: preview ? '#43d9ad' : '#555', display:'inline-flex', alignItems:'center', gap:4 }}>{preview ? <CheckCircle2 size={10} /> : <Circle size={10} />} 2D Image</span>
            <span style={{ color:'#333' }}>·</span>
            <span style={{ fontSize:10, color: model3d ? '#43d9ad' : '#555', display:'inline-flex', alignItems:'center', gap:4 }}>{model3d ? <CheckCircle2 size={10} /> : <Circle size={10} />} 3D Model</span>
            <span style={{ color:'#333' }}>·</span>
            <span style={{ fontSize:10, color: form.name ? '#43d9ad' : '#555', display:'inline-flex', alignItems:'center', gap:4 }}>{form.name ? <CheckCircle2 size={10} /> : <Circle size={10} />} Name</span>
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
          <button className="admin-submit-purple" onClick={addFurniture}
            style={{ opacity: (preview && model3d && form.name) ? 1 : 0.5 }}>
            Add Furniture
          </button>
        </div>
        <div>
          <div className="admin-item-count">{store.furniture.length} items in catalog</div>
          {store.furniture.length === 0
            ? <div className="admin-empty">No furniture added yet</div>
            : <div className="admin-items-grid">{store.furniture.map(item => <ItemCard key={item.id} item={item} section="furniture" />)}</div>
          }
        </div>
      </div>
    </div>
  )

  const currentNav = NAV.find(n => n.id === page)

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-icon"><Settings size={18} /></div>
          <div className="admin-sidebar__logo-text">
            <div className="admin-sidebar__logo-name">HomePlan3D</div>
            <div className="admin-sidebar__logo-badge">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__section-label">Menu</div>
          {NAV.map(item => {
            const active = page === item.id
            const count = item.id==='furniture' ? store.furniture.length : item.id==='textures' ? store.textures.length : null
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`admin-nav-btn ${active ? 'admin-nav-btn--active' : 'admin-nav-btn--inactive'}`}>
                <span className="admin-nav-btn__icon"><item.icon size={16} /></span>
                <span className="admin-nav-btn__label">{item.label}</span>
                {count > 0 && (
                  <span className={`admin-nav-btn__badge ${item.id==='textures' ? 'admin-nav-btn__badge--teal' : 'admin-nav-btn__badge--purple'}`}>{count}</span>
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
          </div>
        </header>
        <main className="admin-content">
          {page==='dashboard' && DashboardView()}
          {page==='furniture' && FurnitureView()}
        </main>
      </div>
    </div>
  )
}