import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Heart, HeartOff, LayoutGrid, List, Paintbrush, Search } from 'lucide-react'
import '../styles/pages/FurnitureCatalogPage.css'

const getAdminAssets = () => JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[],"textures":[]}')

const CATEGORIES = ['all','sofa','chair','table','bed','storage','light','kitchen','bathroom','decor']

const DEMO_ITEMS = [
  // { id: 'demo1', name: 'Milano Sofa',       category: 'sofa',    width: 220, depth: 90,  rating: 4.8, reviews: 124, image: null, colors: ['#c8a878','#4a4a6a','#8b5e3c'] },
  // { id: 'demo2', name: 'Arc Floor Lamp',    category: 'light',   width: 40,  depth: 40,  rating: 4.6, reviews: 87,  image: null, colors: ['#c0c0c0','#1a1a1a','#b8860b'] },
  // { id: 'demo3', name: 'Oslo Dining Table', category: 'table',   width: 180, depth: 90,  rating: 4.9, reviews: 203, image: null, colors: ['#8b6914','#d4c4a8','#2d2d2d'] },
  // { id: 'demo4', name: 'Nordic Bed Frame',  category: 'bed',     width: 180, depth: 210, rating: 4.7, reviews: 156, image: null, colors: ['#e8e2d8','#6b4c2a','#1a1a2e'] },
  // { id: 'demo5', name: 'Barrel Armchair',   category: 'chair',   width: 80,  depth: 80,  rating: 4.5, reviews: 91,  image: null, colors: ['#c8a878','#4a7a9b','#228b22'] },
  // { id: 'demo6', name: 'Oak Bookshelf',     category: 'storage', width: 90,  depth: 35,  rating: 4.4, reviews: 72,  image: null, colors: ['#8b6914','#d4c4a8','#2d2d2d'] },
  // { id: 'demo7', name: 'Pendant Light',     category: 'light',   width: 40,  depth: 40,  rating: 4.7, reviews: 118, image: null, colors: ['#c0c0c0','#1a1a1a','#b8860b'] },
  // { id: 'demo8', name: 'Coffee Table',      category: 'table',   width: 120, depth: 60,  rating: 4.6, reviews: 145, image: null, colors: ['#c8a878','#1a1a1a','#d4c4a8'] },
]

const ITEM_GRADIENTS = {
  // sofa:    'linear-gradient(135deg,#1a1535,#2d2a6e)',
  // chair:   'linear-gradient(135deg,#0f1f2e,#1a3a4a)',
  // table:   'linear-gradient(135deg,#1a1206,#3d2a0a)',
  // bed:     'linear-gradient(135deg,#0d1b2a,#1b3a5f)',
  // storage: 'linear-gradient(135deg,#101a10,#1a3a1a)',
  // light:   'linear-gradient(135deg,#1a1a06,#3d3a10)',
  // kitchen: 'linear-gradient(135deg,#1a0606,#3d1a1a)',
  // bathroom:'linear-gradient(135deg,#061a1a,#0d3a3a)',
  // decor:   'linear-gradient(135deg,#1a0a1a,#3d1a3d)',
}
const CategoryIcon = ({ cat, size = 16 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  switch (cat) {
    case 'all':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'sofa':
      return (
        <svg {...props}>
          <rect x="4" y="10" width="16" height="7" rx="2" />
          <path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
          <path d="M6 17v2M18 17v2" />
        </svg>
      )
    case 'chair':
      return (
        <svg {...props}>
          <rect x="7" y="5" width="10" height="7" rx="2" />
          <rect x="7" y="12" width="10" height="4" rx="1.5" />
          <path d="M8 16v3M16 16v3" />
        </svg>
      )
    case 'table':
      return (
        <svg {...props}>
          <rect x="4" y="7" width="16" height="3.5" rx="1.5" />
          <path d="M7 10.5v8M17 10.5v8" />
        </svg>
      )
    case 'bed':
      return (
        <svg {...props}>
          <path d="M4 9h4a2 2 0 0 1 2 2v2H4z" />
          <rect x="10" y="9" width="10" height="6" rx="2" />
          <path d="M4 15h16M5 15v3M19 15v3" />
        </svg>
      )
    case 'storage':
      return (
        <svg {...props}>
          <rect x="6" y="3.5" width="12" height="17" rx="2" />
          <path d="M6 9h12M6 14.5h12" />
          <circle cx="12" cy="6.3" r=".8" fill="currentColor" />
          <circle cx="12" cy="11.8" r=".8" fill="currentColor" />
          <circle cx="12" cy="17.3" r=".8" fill="currentColor" />
        </svg>
      )
    case 'light':
      return (
        <svg {...props}>
          <path d="M12 4a5 5 0 0 0-3.5 8.6c.8.7 1.2 1.4 1.2 2.3h4.6c0-.9.4-1.6 1.2-2.3A5 5 0 0 0 12 4z" />
          <path d="M10 17h4M10.5 19h3" />
        </svg>
      )
    case 'kitchen':
      return (
        <svg {...props}>
          <path d="M7 4v7M5.5 4v7M8.5 4v7M7 11v9" />
          <path d="M15 4v16M15 4c2 0 3 1.5 3 3.5S17 11 15 11" />
        </svg>
      )
    case 'bathroom':
      return (
        <svg {...props}>
          <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
          <path d="M7 12V9a2 2 0 0 1 2-2h2" />
        </svg>
      )
    case 'decor':
      return (
        <svg {...props}>
          <path d="M12 5c3 1.2 4.5 3.7 4.5 6.5H12z" />
          <path d="M12 5c-3 1.2-4.5 3.7-4.5 6.5H12z" />
          <path d="M12 11.5V18" />
          <path d="M8.5 18h7l-1 2h-5z" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      )
  }
}

const StarRating = ({ rating }) => {
  const full = Math.floor(rating), half = rating % 1 >= 0.5
  return (
    <span className="catalog-card__stars">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half?1:0))}
    </span>
  )
}

export default function FurnitureCatalogPage() {
  const navigate = useNavigate()
  const [assets,       setAssets]       = useState({ furniture: [], textures: [] })
  const [activeCat,    setActiveCat]    = useState('all')
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('popular')
  const [view,         setView]         = useState('grid')
  const [wishlist,     setWishlist]     = useState({})
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    setAssets(getAdminAssets())
    const onFocus = () => setAssets(getAdminAssets())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const allItems = [...assets.furniture.map(f => ({ ...f, isReal: true })), ...DEMO_ITEMS]

  const filtered = allItems
    .filter(item =>
      (activeCat === 'all' || item.category === activeCat) &&
      (!search || item.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'popular') return (b.reviews||0) - (a.reviews||0)
      if (sort === 'rating')  return (b.rating||0) - (a.rating||0)
      return a.name.localeCompare(b.name)
    })

  const toggleWishlist = (e, id) => {
    e && e.stopPropagation()
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleUseInEditor = (item) => {
    localStorage.setItem('homeplan3d_quickAdd', JSON.stringify(item))
    navigate('/editor')
  }

  const gradient = (cat) => ITEM_GRADIENTS[cat] || 'linear-gradient(135deg,#1a1a2e,#2d2a6e)'

  return (
    <div className="catalog-page">

      {/* Hero */}
      <div className="catalog-hero">
        <div className="catalog-hero__bg" />
        <div className="catalog-hero__inner">
          <div className="catalog-hero__badge"><Armchair size={14} strokeWidth={2} /> Furniture Catalog</div>
          <h1 className="catalog-hero__title">
            Premium Furniture<br />
            <span className="catalog-hero__title-gradient">for Every Space</span>
          </h1>
          <p className="catalog-hero__subtitle">
            Browse {allItems.length}+ curated furniture items. Add them directly to your floor plan and visualize in 3D.
          </p>
          <div className="catalog-hero__actions">
            <button className="catalog-hero__btn-primary" onClick={() => navigate('/dashboard')}>Open Editor</button>
          </div>
        </div>
      </div>

      <div className="catalog-layout">

        {/* Sidebar */}
        <div className="catalog-sidebar">
          <div className="catalog-sidebar__box">
            <div className="catalog-sidebar__label">Categories</div>
            <div className="catalog-sidebar__cats">
              {CATEGORIES.map(cat => {
                const count = allItems.filter(i => cat === 'all' || i.category === cat).length
                return (
                  <button key={cat}
                    className={`catalog-cat-btn catalog-cat-btn--${activeCat === cat ? 'active' : 'inactive'}`}
                    onClick={() => setActiveCat(cat)}>
                    <span className="catalog-cat-btn__name">
                      <CategoryIcon cat={cat} size={18} /> {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                    <span className="catalog-cat-btn__count">{count}</span>
                  </button>
                )
              })}
            </div>

            {Object.values(wishlist).some(Boolean) && (
              <div className="catalog-sidebar__divider">
                <div className="catalog-sidebar__label catalog-sidebar__label--with-icon"><Heart size={12} fill="currentColor" /> Wishlist</div>
                <div className="catalog-sidebar__wishlist-count">
                  {Object.values(wishlist).filter(Boolean).length} items saved
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main */}
        <div className="catalog-main">

          {/* Toolbar */}
          <div className="catalog-toolbar">
            <div className="catalog-search-wrap">
              <span className="catalog-search-icon"><Search size={14} strokeWidth={2.1} /></span>
              <input className="catalog-search" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search furniture..." />
            </div>
            <select className="catalog-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="name">A–Z</option>
            </select>
            <div className="catalog-view-toggle">
              {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`catalog-view-btn catalog-view-btn--${view === v ? 'active' : 'inactive'}`}>
                  <Icon size={14} strokeWidth={2.1} />
                </button>
              ))}
            </div>
          </div>

          <div className="catalog-result-count">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''} · {activeCat !== 'all' ? activeCat : 'all categories'}
          </div>

          {/* Items */}
          {filtered.length === 0 ? (
            <div className="catalog-empty">
              <div className="catalog-empty__icon"><Armchair size={44} strokeWidth={1.7} /></div>
              <h3 className="catalog-empty__title">No items found</h3>
              <p className="catalog-empty__sub">Try a different search or add items via Admin.</p>
            </div>
          ) : view === 'grid' ? (
            <div className="catalog-grid">
              {filtered.map(item => (
                <div key={item.id} className="catalog-card" onClick={() => setSelectedItem(item)}>
                  <div className="catalog-card__img-wrap" style={{ background: gradient(item.category) }}>
                    {item.image
                      ? <img className="catalog-card__img" src={item.image} alt={item.name} />
                      : <div className="catalog-card__placeholder">
                          <span className="catalog-card__emoji"><CategoryIcon cat={item.category} size={46} /></span>
                          <span className="catalog-card__dims">{item.width}×{item.depth}cm</span>
                        </div>
                    }
                    <button className="catalog-card__wish-btn" onClick={e => toggleWishlist(e, item.id)}>
                      {wishlist[item.id]
                        ? <Heart size={14} fill="currentColor" strokeWidth={2.1} />
                        : <HeartOff size={14} strokeWidth={2.1} />
                      }
                    </button>
                    {item.isReal && <div className="catalog-card__real-badge">In Catalog</div>}
                    <div className="catalog-card__overlay">
                      <button className="catalog-card__overlay-btn" onClick={e => { e.stopPropagation(); handleUseInEditor(item) }}>
                        <Paintbrush size={14} strokeWidth={2.1} /> Use in Editor
                      </button>
                    </div>
                  </div>
                  <div className="catalog-card__body">
                    <div className="catalog-card__row">
                      <span className="catalog-card__name">{item.name}</span>
                    </div>
                    <div className="catalog-card__meta">
                      <div className="catalog-card__rating">
                        <StarRating rating={item.rating || 4.5} />
                        <span className="catalog-card__review-count">({item.reviews||0})</span>
                      </div>
                      {item.colors && (
                        <div className="catalog-card__colors">
                          {item.colors.slice(0,3).map(c => (
                            <div key={c} className="catalog-card__color-dot" style={{ background: c }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="catalog-list">
              {filtered.map(item => (
                <div key={item.id} className="catalog-list-row" onClick={() => setSelectedItem(item)}>
                  <div className="catalog-list-row__thumb" style={{ background: gradient(item.category) }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} />
                      : <span className="catalog-list-row__thumb-emoji"><CategoryIcon cat={item.category} size={28} /></span>
                    }
                  </div>
                  <div className="catalog-list-row__info">
                    <div className="catalog-list-row__name-row">
                      <span className="catalog-list-row__name">{item.name}</span>
                      {item.isReal && <span className="catalog-list-row__real-badge">REAL</span>}
                    </div>
                    <div className="catalog-list-row__rating-row">
                      <span className="catalog-list-row__stars">{'★'.repeat(Math.floor(item.rating||4.5))}</span>
                      <span className="catalog-list-row__reviews">({item.reviews||0})</span>
                      <span className="catalog-list-row__dims">· {item.width}×{item.depth}cm</span>
                    </div>
                    <span className="catalog-list-row__cat">{item.category}</span>
                  </div>
                  <div className="catalog-list-row__actions">
                    <button className="catalog-list-row__use-btn" onClick={e => { e.stopPropagation(); handleUseInEditor(item) }}>
                      Use →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="catalog-modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="catalog-modal" onClick={e => e.stopPropagation()}>
            <div className="catalog-modal__img-wrap" style={{ background: gradient(selectedItem.category) }}>
              {selectedItem.image
                ? <img className="catalog-modal__img" src={selectedItem.image} alt={selectedItem.name} />
                : <span className="catalog-modal__placeholder-emoji"><CategoryIcon cat={selectedItem.category} size={72} /></span>
              }
              <button className="catalog-modal__close-btn" onClick={() => setSelectedItem(null)}>×</button>
            </div>
            <div className="catalog-modal__body">
              <div className="catalog-modal__header">
                <div>
                  <div className="catalog-modal__title">{selectedItem.name}</div>
                  <div className="catalog-modal__rating-row">
                    <span className="catalog-modal__stars">{'★'.repeat(Math.floor(selectedItem.rating||4.5))}</span>
                    <span className="catalog-modal__reviews">{selectedItem.reviews||0} reviews</span>
                    <span className="catalog-modal__cat-badge">{selectedItem.category}</span>
                  </div>
                </div>
              </div>

              <div className="catalog-modal__specs">
                {[['Width',selectedItem.width+'cm'],['Depth',selectedItem.depth+'cm'],['Category',selectedItem.category],['Status',selectedItem.isReal?'In Catalog':'Demo']].map(([k,v]) => (
                  <div key={k}>
                    <div className="catalog-modal__spec-key">{k}</div>
                    <div className="catalog-modal__spec-val">{v}</div>
                  </div>
                ))}
              </div>

              {selectedItem.colors && (
                <div>
                  <div className="catalog-modal__colors-label">Available Colors</div>
                  <div className="catalog-modal__colors">
                    {selectedItem.colors.map(c => (
                      <div key={c} className="catalog-modal__color-swatch" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              )}

              <div className="catalog-modal__actions">
                <button className="catalog-modal__use-btn" onClick={() => handleUseInEditor(selectedItem)}>
                  <Paintbrush size={14} strokeWidth={2.1} /> Use in Editor
                </button>
                <button className="catalog-modal__wish-btn" onClick={e => toggleWishlist(e, selectedItem.id)}>
                  {wishlist[selectedItem.id]
                    ? <Heart size={16} fill="currentColor" strokeWidth={2.1} />
                    : <HeartOff size={16} strokeWidth={2.1} />
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}