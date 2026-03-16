import React, { useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCategory } from '../../store/slices/furnitureSlice'

const CATS = [
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

const ITEMS = [
  { id:'f1',  name:'Modular Sofa',   cat:'sofa',     w:240, d:90  },
  { id:'f2',  name:'Eames Chair',    cat:'chair',    w:80,  d:85  },
  { id:'f3',  name:'Coffee Table',   cat:'table',    w:120, d:60  },
  { id:'f4',  name:'King Bed',       cat:'bed',      w:180, d:200 },
  { id:'f5',  name:'Floor Lamp',     cat:'lighting', w:40,  d:40  },
  { id:'f6',  name:'Bookshelf',      cat:'storage',  w:80,  d:30  },
  { id:'f7',  name:'Dining Chair',   cat:'chair',    w:50,  d:55  },
  { id:'f8',  name:'Side Table',     cat:'table',    w:45,  d:45  },
  { id:'f9',  name:'Pendant Light',  cat:'lighting', w:30,  d:30  },
  { id:'f10', name:'Cabinet',        cat:'storage',  w:100, d:40  },
  { id:'f11', name:'Sectional Sofa', cat:'sofa',     w:300, d:150 },
  { id:'f12', name:'Kitchen Island', cat:'kitchen',  w:120, d:60  },
  { id:'f13', name:'Bathtub',        cat:'bathroom', w:170, d:75  },
  { id:'f14', name:'Plant',          cat:'decor',    w:40,  d:40  },
  { id:'f15', name:'Armchair',       cat:'chair',    w:80,  d:80  },
  { id:'f16', name:'Wardrobe',       cat:'storage',  w:150, d:55  },
  { id:'f17', name:'Desk',           cat:'table',    w:140, d:70  },
  { id:'f18', name:'TV Stand',       cat:'storage',  w:180, d:45  },
]

function getAdminFurniture() {
  try {
    const store = JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[]}')
    return (store.furniture || []).map(f => ({
      id: f.id, name: f.name, cat: f.category,
      w: f.width || 80, d: f.depth || 80,
      image: f.image,
      model3d: f.model3d || null,
      isAdmin: true,
    }))
  } catch { return [] }
}

// Single item card — always same fixed size
function FurnitureCard({ item, dispatch_drag }) {
  const [imgFailed, setImgFailed] = useState(false)
  const icon = ICONS[item.cat] || ICONS.default
  const showImage = item.image && !imgFailed

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('furniture', JSON.stringify(item))
        const ghost = document.createElement('div')
        ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;width:50px;height:50px;background:#6c63ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;'
        ghost.textContent = '🪑'
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
        <div style={{ fontSize: 11, fontWeight: 600, color: '#ccc', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ fontSize: 9, color: '#4a4a6a', marginTop: 2 }}>
          {item.w}×{item.d} cm
        </div>
      </div>
    </div>
  )
}

export default function FurniturePanel() {
  const dispatch = useDispatch()
  const { activeCategory } = useSelector(s => s.furniture)
  const [search,   setSearch]   = useState('')
  const [viewMode, setViewMode] = useState('blueprint')
  const [width,    setWidth]    = useState(260)
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

  const allItems = [...getAdminFurniture(), ...ITEMS]
  const filtered  = allItems.filter(f =>
    (activeCategory ? f.cat === activeCategory : f.cat === 'sofa') &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()))
  )

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
        <div style={{ fontWeight: 800, fontSize: 13, fontFamily: 'Syne,sans-serif', color: '#e8e8f0', marginBottom: 10 }}>🪑 Furniture</div>
        <div style={{ display: 'flex', marginBottom: 10 }}>
          {[['blueprint','Blueprint'],['textures','Textures']].map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: viewMode === v ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.03)',
              border: viewMode === v ? '1px solid rgba(108,99,255,0.45)' : '1px solid rgba(255,255,255,0.07)',
              color: viewMode === v ? '#9b95ff' : '#666',
              borderRadius: v === 'blueprint' ? '7px 0 0 7px' : '0 7px 7px 0',
            }}>{l}</button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search furniture..."
          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e8e8f0', fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* Category pills */}
      <div style={{ padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
        {CATS.map(c => (
          <button key={String(c.id)} onClick={() => dispatch(setCategory(c.id))} style={{
            padding: '3px 9px', borderRadius: 5, cursor: 'pointer', fontSize: 10, fontWeight: 600,
            background: activeCategory === c.id ? 'rgba(108,99,255,0.2)' : 'transparent',
            border: `1px solid ${activeCategory === c.id ? 'rgba(108,99,255,0.45)' : 'transparent'}`,
            color: activeCategory === c.id ? '#9b95ff' : '#666',
          }}>{c.label}</button>
        ))}
      </div>

      {/* Items grid — scrollable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
        {filtered.map(item => (
          <FurnitureCard key={item.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#444', fontSize: 11 }}>No items found</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#3a3a5a', textAlign: 'center', flexShrink: 0 }}>
        Drag items onto canvas • drag left edge to resize
      </div>
    </div>
  )
}