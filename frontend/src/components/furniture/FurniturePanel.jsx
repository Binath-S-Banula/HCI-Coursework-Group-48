import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCategory } from '../../store/slices/furnitureSlice'
import { furnitureService } from '../../services/furniture.service'
import { Armchair, Box, CheckCircle2, Circle, Image as ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react'

const CATS = [
  { id: 'all',      label: 'All'     },
  { id: 'my',       label: 'My'      },
  { id: 'sofa',     label: 'Sofa'    },
  { id: 'chair',    label: 'Chair'   },
  { id: 'table',    label: 'Table'   },
  { id: 'bed',      label: 'Bed'     },
  { id: 'storage',  label: 'Storage' },
  { id: 'lighting', label: 'Lights'  },
  { id: 'kitchen',  label: 'Kitchen' },
  { id: 'bathroom', label: 'Bath'    },
  { id: 'decor',    label: 'Decor'   },
]

const ICONS = {
  sofa: <svg width="56" height="56" viewBox="0 0 64 40" fill="none"><rect x="4" y="18" width="56" height="16" rx="4" fill="#6c63ff" opacity="0.7"/><rect x="4" y="10" width="12" height="24" rx="3" fill="#9b95ff" opacity="0.8"/><rect x="48" y="10" width="12" height="24" rx="3" fill="#9b95ff" opacity="0.8"/><rect x="4" y="10" width="56" height="10" rx="4" fill="#8880ff" opacity="0.6"/><rect x="8" y="34" width="6" height="4" rx="1" fill="#555"/><rect x="50" y="34" width="6" height="4" rx="1" fill="#555"/></svg>,
  chair: <svg width="56" height="56" viewBox="0 0 48 48" fill="none"><rect x="10" y="8" width="28" height="18" rx="4" fill="#6c63ff" opacity="0.7"/><rect x="8" y="24" width="32" height="8" rx="3" fill="#9b95ff" opacity="0.8"/><rect x="8" y="8" width="6" height="30" rx="2" fill="#8880ff" opacity="0.6"/><rect x="34" y="8" width="6" height="30" rx="2" fill="#8880ff" opacity="0.6"/><rect x="10" y="36" width="4" height="8" rx="1" fill="#555"/><rect x="34" y="36" width="4" height="8" rx="1" fill="#555"/></svg>,
  table: <svg width="56" height="56" viewBox="0 0 64 40" fill="none"><rect x="4" y="10" width="56" height="8" rx="3" fill="#43d9ad" opacity="0.8"/><rect x="8" y="18" width="6" height="18" rx="2" fill="#43d9ad" opacity="0.5"/><rect x="50" y="18" width="6" height="18" rx="2" fill="#43d9ad" opacity="0.5"/></svg>,
  bed: <svg width="56" height="56" viewBox="0 0 72 48" fill="none"><rect x="4" y="20" width="64" height="22" rx="4" fill="#6c63ff" opacity="0.6"/><rect x="4" y="8" width="18" height="34" rx="3" fill="#9b95ff" opacity="0.7"/><rect x="26" y="22" width="20" height="14" rx="3" fill="#e8e8f0" opacity="0.15"/><rect x="4" y="38" width="8" height="6" rx="1" fill="#555"/><rect x="60" y="38" width="8" height="6" rx="1" fill="#555"/></svg>,
  storage: <svg width="56" height="56" viewBox="0 0 48 56" fill="none"><rect x="6" y="4" width="36" height="48" rx="3" fill="#9b95ff" opacity="0.5"/><rect x="6" y="4" width="36" height="12" rx="3" fill="#6c63ff" opacity="0.7"/><rect x="6" y="20" width="36" height="12" fill="#6c63ff" opacity="0.5"/><rect x="6" y="36" width="36" height="16" fill="#6c63ff" opacity="0.4"/><circle cx="24" cy="10" r="2" fill="#e8e8f0" opacity="0.6"/><circle cx="24" cy="26" r="2" fill="#e8e8f0" opacity="0.6"/><circle cx="24" cy="44" r="2" fill="#e8e8f0" opacity="0.6"/></svg>,
  lighting: <svg width="56" height="56" viewBox="0 0 40 56" fill="none"><ellipse cx="20" cy="16" rx="14" ry="10" fill="#f59e0b" opacity="0.7"/><rect x="18" y="26" width="4" height="24" rx="2" fill="#888"/><ellipse cx="20" cy="52" rx="8" ry="3" fill="#555"/></svg>,
  kitchen: <svg width="56" height="56" viewBox="0 0 64 48" fill="none"><rect x="4" y="20" width="56" height="24" rx="3" fill="#43d9ad" opacity="0.5"/><rect x="4" y="8" width="56" height="14" rx="3" fill="#43d9ad" opacity="0.7"/><circle cx="20" cy="15" r="5" fill="#e8e8f0" opacity="0.2"/><circle cx="44" cy="15" r="5" fill="#e8e8f0" opacity="0.2"/><rect x="10" y="24" width="20" height="16" rx="2" fill="rgba(255,255,255,0.06)"/><rect x="34" y="24" width="22" height="16" rx="2" fill="rgba(255,255,255,0.06)"/></svg>,
  bathroom: <svg width="56" height="56" viewBox="0 0 72 40" fill="none"><rect x="4" y="16" width="64" height="20" rx="10" fill="#6c63ff" opacity="0.4"/><rect x="4" y="20" width="64" height="16" rx="4" fill="#6c63ff" opacity="0.6"/><rect x="4" y="8" width="10" height="12" rx="3" fill="#9b95ff" opacity="0.6"/></svg>,
  decor: <svg width="56" height="56" viewBox="0 0 40 56" fill="none"><ellipse cx="20" cy="20" rx="14" ry="18" fill="#43d9ad" opacity="0.5"/><ellipse cx="20" cy="16" rx="10" ry="12" fill="#43d9ad" opacity="0.4"/><rect x="16" y="36" width="8" height="16" rx="2" fill="#888"/><ellipse cx="20" cy="52" rx="6" ry="3" fill="#555"/></svg>,
  default: <svg width="56" height="56" viewBox="0 0 48 48" fill="none"><rect x="8" y="8" width="32" height="32" rx="4" fill="#6c63ff" opacity="0.5"/></svg>,
}

const DEFAULT_SIZE_BY_CATEGORY_CM = {
  sofa: { w: 220, d: 95 },
  chair: { w: 60, d: 60 },
  table: { w: 160, d: 90 },
  bed: { w: 180, d: 200 },
  storage: { w: 90, d: 45 },
  lighting: { w: 45, d: 45 },
  kitchen: { w: 120, d: 60 },
  bathroom: { w: 80, d: 60 },
  decor: { w: 60, d: 60 },
  other: { w: 100, d: 80 },
}

const getDefaultSizeByCategory = (category) => {
  const key = String(category || '').toLowerCase()
  return DEFAULT_SIZE_BY_CATEGORY_CM[key] || DEFAULT_SIZE_BY_CATEGORY_CM.other
}

const normalizeSize = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const ITEMS = []
const MAX_MODEL_FILE_SIZE = 100 * 1024 * 1024

const emptyForm = {
  name: '',
  category: 'sofa',
  width: '',
  depth: '',
}

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// Single item card — always same fixed size
function FurnitureCard({ item, onEdit, onDelete }) {
  const [imgFailed, setImgFailed] = useState(false)
  const icon = ICONS[item.cat] || ICONS.default
  const showImage = item.image && !imgFailed

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('furniture', JSON.stringify(item))
        const ghost = document.createElement('div')
        ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;width:50px;height:50px;background:#6c63ff;border-radius:8px;display:flex;align-items:center;justify-content:center;'
        ghost.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><rect x="4" y="11" width="16" height="5" rx="1"/><path d="M6 16v2M18 16v2"/></svg>'
        document.body.appendChild(ghost)
        e.dataTransfer.setDragImage(ghost, 25, 25)
        setTimeout(() => document.body.removeChild(ghost), 0)
      }}
      style={{
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        cursor: 'grab',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,99,255,0.45)'; e.currentTarget.style.background = 'rgba(108,99,255,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
    >
      {/* Thumbnail — fixed 80px height always */}
      <div style={{
        height: 80,
        flexShrink: 0,
        background: 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {showImage ? (
          <img
            src={item.image}
            alt={item.name}
            style={{ width: 60, height: 60, objectFit: 'contain', filter: 'brightness(0) invert(0.75)', display: 'block' }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
        )}
      </div>

      {/* Label — fixed, no grow */}
      <div style={{ padding: '5px 8px 7px', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ccc', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {item.name}
          </div>
          {item.isMine && (
            <span style={{ fontSize: 8, fontWeight: 700, color: '#43d9ad', border: '1px solid rgba(67,217,173,0.5)', borderRadius: 4, padding: '1px 4px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              My
            </span>
          )}
        </div>
        <div style={{ fontSize: 9, color: '#4a4a6a', marginTop: 2 }}>
          {item.w}×{item.d} cm
        </div>
        {item.isMine && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onEdit(item)
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 10,
                color: '#9b95ff',
                background: 'rgba(108,99,255,0.12)',
                border: '1px solid rgba(108,99,255,0.35)',
                borderRadius: 6,
                padding: '4px 6px',
                cursor: 'pointer',
              }}
            >
              <Pencil size={10} /> Edit
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onDelete(item)
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                fontSize: 10,
                color: '#ff6b6b',
                background: 'rgba(255,107,107,0.08)',
                border: '1px solid rgba(255,107,107,0.35)',
                borderRadius: 6,
                padding: '4px 6px',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FurniturePanel() {
  const dispatch = useDispatch()
  const { activeCategory } = useSelector(s => s.furniture)
  const { user } = useSelector(s => s.auth)
  const [items, setItems] = useState([])
  const [width,    setWidth]    = useState(260)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [preview, setPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [model3dFile, setModel3dFile] = useState(null)
  const [model3dName, setModel3dName] = useState('')
  const [statusText, setStatusText] = useState('')
  const [statusType, setStatusType] = useState('success')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isResizing = useRef(false)
  const startX     = useRef(0)
  const startW     = useRef(0)

  const onMouseDown = useCallback((e) => {
    isResizing.current = true
    startX.current = e.clientX
    startW.current = width
    const onMove = (me) => {
      if (!isResizing.current) return
      const newW = Math.min(480, Math.max(220, startW.current + (startX.current - me.clientX)))
      setWidth(newW)
    }
    const onUp = () => {
      isResizing.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    e.preventDefault()
  }, [width])

  const flash = useCallback((text, type = 'success') => {
    setStatusText(text)
    setStatusType(type)
    window.clearTimeout(window.__furniturePanelFlashTimer)
    window.__furniturePanelFlashTimer = window.setTimeout(() => {
      setStatusText('')
    }, 2800)
  }, [])

  const resetForm = useCallback(() => {
    setForm(emptyForm)
    setEditingItem(null)
    setPreview(null)
    setImageFile(null)
    setModel3dFile(null)
    setModel3dName('')
  }, [])

  const closeFormModal = useCallback(() => {
    setIsFormOpen(false)
    resetForm()
  }, [resetForm])

  const loadFurniture = useCallback(async () => {
    try {
      const res = await furnitureService.getAll({ limit: 500, includeMine: true })
      const userId = String(user?._id || '')
      const mapped = (res.data || []).map((f) => {
        const defaults = getDefaultSizeByCategory(f.category)
        const ownerId = typeof f.uploadedBy === 'string' ? f.uploadedBy : String(f.uploadedBy?._id || '')
        const isMine = Boolean(userId && ownerId && ownerId === userId && f.visibility === 'private')
        return {
          id: f._id,
          name: f.name,
          cat: f.category,
          w: normalizeSize(f.width, defaults.w),
          d: normalizeSize(f.depth, defaults.d),
          image: f.imageUrl,
          model3d: f.model3d || null,
          model3dName: f.model3dName || '',
          isMine,
        }
      })
      setItems(mapped)
    } catch {
      setItems([])
      flash('Failed to load furniture', 'error')
    }
  }, [flash, user?._id])

  useEffect(() => {
    loadFurniture()
  }, [loadFurniture])

  useEffect(() => {
    return () => {
      window.clearTimeout(window.__furniturePanelFlashTimer)
    }
  }, [])

  const openAddModal = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const openEditModal = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name || '',
      category: item.cat || 'sofa',
      width: String(item.w ?? ''),
      depth: String(item.d ?? ''),
    })
    setPreview(item.image || null)
    setImageFile(null)
    setModel3dFile(null)
    setModel3dName(item.model3dName || '')
    setIsFormOpen(true)
  }

  const openDeleteModal = (item) => {
    setPendingDelete(item)
    setIsDeleteOpen(true)
  }

  const saveFurniture = async () => {
    if (!form.name.trim()) {
      flash('Please enter furniture name', 'error')
      return
    }

    const isEditing = Boolean(editingItem)
    if (!isEditing && !imageFile) {
      flash('Please upload a 2D furniture image', 'error')
      return
    }

    if (!isEditing && !model3dFile) {
      flash('Please upload a 3D model (.glb or .gltf)', 'error')
      return
    }

    if (model3dFile && model3dFile.size > MAX_MODEL_FILE_SIZE) {
      flash('3D model file must be 100MB or smaller', 'error')
      return
    }

    try {
      setSaving(true)
      const payload = new FormData()
      payload.append('name', form.name.trim())
      payload.append('category', form.category)
      payload.append('price', '0')
      payload.append('width', String(Number(form.width) || 80))
      payload.append('depth', String(Number(form.depth) || 80))
      if (imageFile) payload.append('image', imageFile)
      if (model3dFile) {
        payload.append('model3dFile', model3dFile)
        payload.append('model3dName', model3dName)
      }

      if (isEditing) {
        await furnitureService.update(editingItem.id, payload)
        flash('Furniture updated')
      } else {
        await furnitureService.create(payload)
        flash('Furniture added')
      }

      closeFormModal()
      await loadFurniture()
    } catch (err) {
      flash(err?.response?.data?.message || (editingItem ? 'Failed to update furniture' : 'Failed to add furniture'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      setDeleting(true)
      await furnitureService.delete(pendingDelete.id)
      flash('Furniture deleted')
      setIsDeleteOpen(false)
      setPendingDelete(null)
      await loadFurniture()
    } catch (err) {
      flash(err?.response?.data?.message || 'Failed to delete furniture', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const allItems = [...items, ...ITEMS]
  const filtered = allItems.filter((f) => {
    if (!activeCategory || activeCategory === 'all') return true
    if (activeCategory === 'my') return f.isMine
    return f.cat === activeCategory
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width, background: '#13131f', position: 'relative', flexShrink: 0 }}>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, cursor: 'ew-resize', zIndex: 10, background: 'transparent', transition: 'background .15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.5)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      />

      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#e8e8f0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Armchair size={14} /> Furniture
        </div>
        {statusText && (
          <div style={{ marginTop: 8, fontSize: 11, color: statusType === 'error' ? '#ff6b6b' : '#43d9ad' }}>
            {statusText}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
        {CATS.map(c => (
          <button key={String(c.id)} onClick={() => dispatch(setCategory(c.id))} style={{
            minHeight: 28,
            padding: '5px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeCategory === c.id ? 'rgba(108,99,255,0.2)' : 'transparent',
            border: `1px solid ${activeCategory === c.id ? 'rgba(108,99,255,0.45)' : 'transparent'}`,
            color: activeCategory === c.id ? '#9b95ff' : '#666',
          }}>{c.label}</button>
        ))}
      </div>

      {/* Items grid — scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
        {filtered.map(item => (
          <FurnitureCard key={item.id} item={item} onEdit={openEditModal} onDelete={openDeleteModal} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#444', fontSize: 11 }}>No items found</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '9px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button
          onClick={openAddModal}
          style={{
            width: '100%',
            borderRadius: 8,
            border: '1px solid rgba(108,99,255,0.45)',
            background: 'rgba(108,99,255,0.18)',
            color: '#c8c4ff',
            fontWeight: 700,
            fontSize: 12,
            padding: '9px 10px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} /> Add Furniture
        </button>
        <div style={{ marginTop: 8, fontSize: 10, color: '#3a3a5a', textAlign: 'center' }}>
          Drag items onto canvas • drag left edge to resize
        </div>
      </div>

      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(5,5,12,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} role="dialog" aria-modal="true">
          <div style={{ width: '100%', maxWidth: 420, maxHeight: '100%', overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#181829', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ color: '#e8e8f0', fontWeight: 700, fontSize: 14 }}>{editingItem ? 'Edit My Furniture' : 'Add My Furniture'}</div>
              <button onClick={closeFormModal} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#777', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: preview ? '#43d9ad' : '#9b95ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: preview ? '#43d9ad' : 'rgba(108,99,255,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9 }}>{preview ? <CheckCircle2 size={10} /> : '1'}</span>
                2D Image ({editingItem ? 'optional' : 'required'})
              </div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', borderRadius: 10, border: `1px dashed ${preview ? 'rgba(67,217,173,0.6)' : 'rgba(255,255,255,0.15)'}`, background: preview ? 'rgba(67,217,173,0.08)' : 'rgba(255,255,255,0.03)', minHeight: 90, cursor: 'pointer', overflow: 'hidden' }}>
                {preview ? (
                  <img src={preview} alt="Furniture preview" style={{ width: '100%', height: 90, objectFit: 'contain' }} />
                ) : (
                  <>
                    <ImageIcon size={20} color="#666" />
                    <span style={{ marginTop: 6, fontSize: 11, color: '#777' }}>Upload image (.png / .jpg)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setImageFile(file)
                    const nextPreview = await readAsDataUrl(file)
                    setPreview(nextPreview)
                    event.target.value = ''
                  }}
                />
              </label>
              {preview && (
                <button onClick={() => { setPreview(null); setImageFile(null) }} style={{ marginTop: 5, fontSize: 10, border: 'none', background: 'none', color: '#ff6b6b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} /> Remove image
                </button>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: model3dFile ? '#43d9ad' : '#9b95ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: model3dFile ? '#43d9ad' : 'rgba(108,99,255,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9 }}>{model3dFile ? <CheckCircle2 size={10} /> : '2'}</span>
                3D Model ({editingItem ? 'optional' : 'required'})
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, border: `1px solid ${model3dFile ? 'rgba(67,217,173,0.5)' : 'rgba(255,255,255,0.12)'}`, background: model3dFile ? 'rgba(67,217,173,0.07)' : 'rgba(255,255,255,0.03)', padding: '10px 10px', cursor: 'pointer' }}>
                <Box size={18} color="#888" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: model3dFile ? '#43d9ad' : '#777', fontWeight: 600 }}>{model3dName || 'Upload .glb or .gltf'}</div>
                  <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>Max 100MB</div>
                </div>
                {model3dFile && <span style={{ fontSize: 10, color: '#43d9ad' }}>Ready</span>}
                <input
                  type="file"
                  accept=".glb,.gltf"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (file.size > MAX_MODEL_FILE_SIZE) {
                      flash('3D model file must be 100MB or smaller', 'error')
                      event.target.value = ''
                      return
                    }
                    setModel3dFile(file)
                    setModel3dName(file.name)
                    event.target.value = ''
                  }}
                />
              </label>
              {!!model3dFile && (
                <button onClick={() => { setModel3dFile(null); setModel3dName('') }} style={{ marginTop: 5, fontSize: 10, border: 'none', background: 'none', color: '#ff6b6b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <X size={12} /> Remove model
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, padding: '8px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 10, color: preview ? '#43d9ad' : '#555', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{preview ? <CheckCircle2 size={10} /> : <Circle size={10} />} 2D</span>
              <span style={{ fontSize: 10, color: model3dFile ? '#43d9ad' : '#555', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{model3dFile ? <CheckCircle2 size={10} /> : <Circle size={10} />} 3D</span>
              <span style={{ fontSize: 10, color: form.name ? '#43d9ad' : '#555', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{form.name ? <CheckCircle2 size={10} /> : <Circle size={10} />} Name</span>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#9b95ff', fontWeight: 600 }}>
                Name
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Reading Chair" style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#10101a', color: '#ddd', padding: '8px 9px', fontSize: 12 }} />
              </label>
              <label style={{ fontSize: 11, color: '#9b95ff', fontWeight: 600 }}>
                Category
                <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#10101a', color: '#ddd', padding: '8px 9px', fontSize: 12 }}>
                  {CATS.filter((cat) => cat.id !== 'all' && cat.id !== 'my').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ fontSize: 11, color: '#9b95ff', fontWeight: 600 }}>
                  Width (cm)
                  <input type="number" value={form.width} onChange={(event) => setForm((prev) => ({ ...prev, width: event.target.value }))} placeholder="80" style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#10101a', color: '#ddd', padding: '8px 9px', fontSize: 12 }} />
                </label>
                <label style={{ fontSize: 11, color: '#9b95ff', fontWeight: 600 }}>
                  Depth (cm)
                  <input type="number" value={form.depth} onChange={(event) => setForm((prev) => ({ ...prev, depth: event.target.value }))} placeholder="80" style={{ width: '100%', marginTop: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#10101a', color: '#ddd', padding: '8px 9px', fontSize: 12 }} />
                </label>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={closeFormModal} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#888', fontWeight: 600, fontSize: 12, padding: '8px 10px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveFurniture} disabled={saving} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(108,99,255,0.45)', background: 'rgba(108,99,255,0.2)', color: '#c8c4ff', fontWeight: 700, fontSize: 12, padding: '8px 10px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Furniture')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1201, background: 'rgba(5,5,12,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} role="dialog" aria-modal="true">
          <div style={{ width: '100%', maxWidth: 340, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#181829', padding: 14 }}>
            <div style={{ color: '#f1f1f7', fontWeight: 700, fontSize: 14 }}>Delete Furniture</div>
            <div style={{ marginTop: 8, color: '#9a9ab0', fontSize: 12, lineHeight: 1.4 }}>
              Are you sure you want to delete <span style={{ color: '#e8e8f0', fontWeight: 700 }}>{pendingDelete?.name}</span>? This action cannot be undone.
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button onClick={() => { setIsDeleteOpen(false); setPendingDelete(null) }} disabled={deleting} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#888', fontWeight: 600, fontSize: 12, padding: '8px 10px', cursor: deleting ? 'default' : 'pointer' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,107,107,0.45)', background: 'rgba(255,107,107,0.16)', color: '#ff8d8d', fontWeight: 700, fontSize: 12, padding: '8px 10px', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}