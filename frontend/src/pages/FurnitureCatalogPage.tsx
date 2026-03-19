import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/pages/FurnitureCatalogPage.css'

interface FurnitureItem {
  id: string
  name: string
  category: string
  price: number
  width: number
  depth: number
  rating?: number
  reviews?: number
  image: string | null
  colors?: string[]
  isReal?: boolean
}

const getAdminAssets = () => JSON.parse(localStorage.getItem('adminAssets') || '{"furniture":[],"textures":[]}')

const CATEGORIES = ['all','sofa','chair','table','bed','storage','light','kitchen','bathroom','decor']

const DEMO_ITEMS = [
  { id: 'demo1', name: 'Milano Sofa',       category: 'sofa',    price: 1299, width: 220, depth: 90,  rating: 4.8, reviews: 124, image: null, colors: ['#c8a878','#4a4a6a','#8b5e3c'] },
  { id: 'demo2', name: 'Arc Floor Lamp',    category: 'light',   price: 349,  width: 40,  depth: 40,  rating: 4.6, reviews: 87,  image: null, colors: ['#c0c0c0','#1a1a1a','#b8860b'] },
  { id: 'demo3', name: 'Oslo Dining Table', category: 'table',   price: 899,  width: 180, depth: 90,  rating: 4.9, reviews: 203, image: null, colors: ['#8b6914','#d4c4a8','#2d2d2d'] },
  { id: 'demo4', name: 'Nordic Bed Frame',  category: 'bed',     price: 1450, width: 180, depth: 210, rating: 4.7, reviews: 156, image: null, colors: ['#e8e2d8','#6b4c2a','#1a1a2e'] },
  { id: 'demo5', name: 'Barrel Armchair',   category: 'chair',   price: 649,  width: 80,  depth: 80,  rating: 4.5, reviews: 91,  image: null, colors: ['#c8a878','#4a7a9b','#228b22'] },
  { id: 'demo6', name: 'Oak Bookshelf',     category: 'storage', price: 549,  width: 90,  depth: 35,  rating: 4.4, reviews: 72,  image: null, colors: ['#8b6914','#d4c4a8','#2d2d2d'] },
  { id: 'demo7', name: 'Pendant Light',     category: 'light',   price: 229,  width: 40,  depth: 40,  rating: 4.7, reviews: 118, image: null, colors: ['#c0c0c0','#1a1a1a','#b8860b'] },
  { id: 'demo8', name: 'Coffee Table',      category: 'table',   price: 399,  width: 120, depth: 60,  rating: 4.6, reviews: 145, image: null, colors: ['#c8a878','#1a1a1a','#d4c4a8'] },
]

const ITEM_GRADIENTS = {
  sofa:    'linear-gradient(135deg,#1a1535,#2d2a6e)',
  chair:   'linear-gradient(135deg,#0f1f2e,#1a3a4a)',
  table:   'linear-gradient(135deg,#1a1206,#3d2a0a)',
  bed:     'linear-gradient(135deg,#0d1b2a,#1b3a5f)',
  storage: 'linear-gradient(135deg,#101a10,#1a3a1a)',
  light:   'linear-gradient(135deg,#1a1a06,#3d3a10)',
  kitchen: 'linear-gradient(135deg,#1a0606,#3d1a1a)',
  bathroom:'linear-gradient(135deg,#061a1a,#0d3a3a)',
  decor:   'linear-gradient(135deg,#1a0a1a,#3d1a3d)',
}
const ITEM_EMOJIS = { sofa:'🛋️',chair:'🪑',table:'🪵',bed:'🛏️',storage:'🗄️',light:'💡',kitchen:'🍳',bathroom:'🪥',decor:'🪴',default:'📦' }

const StarRating = ({ rating }: { rating: number }) => {
  const full = Math.floor(rating), half = rating % 1 >= 0.5
  return (
    <span className="catalog-card__stars">
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half?1:0))}
    </span>
  )
}

export default function FurnitureCatalogPage() {
  const navigate = useNavigate()
  const [assets,       setAssets]       = useState<{ furniture: FurnitureItem[]; textures: any[] }>({ furniture: [], textures: [] })
  const [activeCat,    setActiveCat]    = useState('all')
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('popular')
  const [view,         setView]         = useState('grid')
  const [wishlist,     setWishlist]     = useState<Record<string, boolean>>({})
  const [selectedItem, setSelectedItem] = useState<FurnitureItem | null>(null)
  const [priceMax,     setPriceMax]     = useState(5000)

  useEffect(() => {
    setAssets(getAdminAssets())
    const onFocus = () => setAssets(getAdminAssets())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const allItems: FurnitureItem[] = [
    ...(Array.isArray(assets.furniture) ? assets.furniture.map((f: any) => ({ ...f, isReal: true })) : []),
    ...DEMO_ITEMS
  ]

  const filtered = allItems
    .filter(item =>
      (activeCat === 'all' || item.category === activeCat) &&
      (!search || item.name.toLowerCase().includes(search.toLowerCase())) &&
      item.price <= priceMax
    )
    .sort((a, b) => {
      if (sort === 'popular')    return (b.reviews||0) - (a.reviews||0)
      if (sort === 'price-asc')  return a.price - b.price
      if (sort === 'price-desc') return b.price - a.price
      if (sort === 'rating')     return (b.rating||0) - (a.rating||0)
      return a.name.localeCompare(b.name)
    })

  const toggleWishlist = (e: React.MouseEvent | null, id: string) => {
    e && e.stopPropagation()
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleUseInEditor = (item: FurnitureItem) => {
    localStorage.setItem('homeplan3d_quickAdd', JSON.stringify(item))
    navigate('/editor')
  }

  const gradient = (cat: keyof typeof ITEM_GRADIENTS | string) => ITEM_GRADIENTS[cat as keyof typeof ITEM_GRADIENTS] || 'linear-gradient(135deg,#1a1a2e,#2d2a6e)'
  const emoji    = (cat: string) => ITEM_EMOJIS[cat as keyof typeof ITEM_EMOJIS] || ITEM_EMOJIS.default

  return (
    <div className="catalog-page">

      {/* Hero */}
      <div className="catalog-hero">
        <div className="catalog-hero__bg" />
        <div className="catalog-hero__inner">
          <div className="catalog-hero__badge">🪑 Furniture Catalog</div>
          <h1 className="catalog-hero__title">
            Premium Furniture<br />
            <span className="catalog-hero__title-gradient">for Every Space</span>
          </h1>
          <p className="catalog-hero__subtitle">
            Browse {allItems.length}+ curated furniture items. Add them directly to your floor plan and visualize in 3D.
          </p>
          <div className="catalog-hero__actions">
            <button className="catalog-hero__btn-primary" onClick={() => navigate('/editor')}>Open Editor</button>
            <button className="catalog-hero__btn-secondary" onClick={() => navigate('/admin')}>+ Add Furniture</button>
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
                      {emoji(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                    <span className="catalog-cat-btn__count">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="catalog-sidebar__divider">
              <div className="catalog-sidebar__label">Price Range</div>
              <div className="catalog-sidebar__price-row">
                <span>$0</span><span>${priceMax}</span>
              </div>
              <input type="range" min={0} max={5000} step={50} value={priceMax}
                className="catalog-sidebar__range"
                onChange={e => setPriceMax(+e.target.value)} />
            </div>

            {Object.values(wishlist).some(Boolean) && (
              <div className="catalog-sidebar__divider">
                <div className="catalog-sidebar__label">❤️ Wishlist</div>
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
              <span className="catalog-search-icon">🔍</span>
              <input className="catalog-search" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search furniture..." />
            </div>
            <select className="catalog-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="name">A–Z</option>
            </select>
            <div className="catalog-view-toggle">
              {[['grid','⊞'],['list','☰']].map(([v, icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`catalog-view-btn catalog-view-btn--${view === v ? 'active' : 'inactive'}`}>
                  {icon}
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
              <div className="catalog-empty__icon">🪑</div>
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
                          <span className="catalog-card__emoji">{emoji(item.category)}</span>
                          <span className="catalog-card__dims">{item.width}×{item.depth}cm</span>
                        </div>
                    }
                    <button className="catalog-card__wish-btn" onClick={e => toggleWishlist(e, item.id)}>
                      {wishlist[item.id] ? '❤️' : '🤍'}
                    </button>
                    {item.isReal && <div className="catalog-card__real-badge">In Catalog</div>}
                    <div className="catalog-card__overlay">
                      <button className="catalog-card__overlay-btn" onClick={e => { e.stopPropagation(); handleUseInEditor(item) }}>
                        🎨 Use in Editor
                      </button>
                    </div>
                  </div>
                  <div className="catalog-card__body">
                    <div className="catalog-card__row">
                      <span className="catalog-card__name">{item.name}</span>
                      <span className="catalog-card__price">${item.price}</span>
                    </div>
                    <div className="catalog-card__meta">
                      <div className="catalog-card__rating">
                        <StarRating rating={item.rating || 4.5} />
                        <span className="catalog-card__review-count">({item.reviews||0})</span>
                      </div>
                      {item.colors && (
                        <div className="catalog-card__colors">
                          {item.colors.slice(0,3).map((c: string) => (
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
                      : <span className="catalog-list-row__thumb-emoji">{emoji(item.category)}</span>
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
                    <span className="catalog-list-row__price">${item.price}</span>
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
                : <span className="catalog-modal__placeholder-emoji">{emoji(selectedItem.category)}</span>
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
                <div className="catalog-modal__price">${selectedItem.price}</div>
              </div>

              <div className="catalog-modal__specs">
                {[['Width',selectedItem.width+'cm'],['Depth',selectedItem.depth+'cm'],['Category',selectedItem.category],['Status',selectedItem.isReal?'✅ In Catalog':'📋 Demo']].map(([k,v]) => (
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
                    {selectedItem.colors.map((c: string) => (
                      <div key={c} className="catalog-modal__color-swatch" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              )}

              <div className="catalog-modal__actions">
                <button className="catalog-modal__use-btn" onClick={() => handleUseInEditor(selectedItem)}>
                  🎨 Use in Editor
                </button>
                <button className="catalog-modal__wish-btn" onClick={e => toggleWishlist(e, selectedItem.id)}>
                  {wishlist[selectedItem.id] ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}