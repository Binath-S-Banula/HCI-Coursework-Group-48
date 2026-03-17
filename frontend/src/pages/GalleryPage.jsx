import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { projectService } from '../services/project.service'
import '../styles/pages/GalleryPage.css'

const CATEGORIES = ['all', 'mine', 'other']

const ROOM_GRADIENTS = [
  'linear-gradient(135deg,#1a1a3e,#2d2a6e)',
  'linear-gradient(135deg,#0f2027,#203a43)',
  'linear-gradient(135deg,#1f0c2e,#3d1a6e)',
  'linear-gradient(135deg,#0d1b2a,#1b4332)',
  'linear-gradient(135deg,#1a0a2e,#2d0a4e)',
  'linear-gradient(135deg,#0a1628,#1e3a5f)',
]
const ROOM_EMOJIS = ['🛋️','🛏️','🍳','🛁','💻','🍽️','🪴','🏠']

export default function GalleryPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useSelector(s => s.auth)
  const [activeCat,    setActiveCat]    = useState('all')
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('popular')
  const [liked,        setLiked]        = useState({})
  const [projects,      setProjects]     = useState([])
  const [loading,       setLoading]      = useState(true)

  useEffect(() => {
    const loadPublic = async () => {
      setLoading(true)
      try {
        const list = await projectService.getPublic()
        setProjects(list)
      } catch {
        setProjects([])
      } finally {
        setLoading(false)
      }
    }
    loadPublic()
  }, [])

  const filtered = projects
    .filter(p =>
      (activeCat === 'all' || (activeCat === 'mine' ? p.owner?._id === user?._id : true)) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'popular') return new Date(b.updatedAt) - new Date(a.updatedAt)
      if (sort === 'newest')  return new Date(b.createdAt) - new Date(a.createdAt)
      return a.name.localeCompare(b.name)
    })

  const toggleLike = (e, id) => {
    e.stopPropagation()
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleOpen = async (project) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (project.owner?._id === user?._id) {
      navigate(`/editor/${project._id}?view=3d`)
      return
    }

    try {
      const copy = await projectService.duplicate(project._id)
      navigate(`/editor/${copy._id}?view=3d`)
    } catch {
      navigate('/dashboard')
    }
  }

  const handleCreateDesign = async () => {
    try {
      const newProject = await projectService.create({ name: 'New Project' })
      navigate(`/editor/${newProject._id}`)
    } catch {
      navigate('/editor')
    }
  }

  return (
    <div className="gallery-page">

      {/* Hero */}
      <div className="gallery-hero">
        <div className="gallery-hero__bg" />
        <div className="gallery-hero__inner">
          <div className="gallery-hero__badge">
            <span className="gallery-hero__badge-dot" />
            Community Designs
          </div>
          <h1 className="gallery-hero__title">
            Discover Amazing<br />
            <span className="gallery-hero__title-gradient">Room Designs</span>
          </h1>
          <p className="gallery-hero__subtitle">
            Browse thousands of home designs from our community. Get inspired, remix, or start fresh.
          </p>
          <button className="gallery-hero__btn" onClick={handleCreateDesign}>
            + Create Your Design
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="gallery-stats">
        {[['4M+','Designs'],['120+','Countries'],['10K+','Items'],['98%','Satisfaction']].map(([v,l]) => (
          <div key={l} className="gallery-stat">
            <div className="gallery-stat__value">{v}</div>
            <div className="gallery-stat__label">{l}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="gallery-main">

        {/* Filters */}
        <div className="gallery-filters">
          <div className="gallery-search-wrap">
            <span className="gallery-search-icon">🔍</span>
            <input
              className="gallery-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search designs..."
            />
          </div>

          <div className="gallery-cats">
            {CATEGORIES.map(cat => (
              <button key={cat}
                className={`gallery-cat-btn gallery-cat-btn--${activeCat === cat ? 'active' : 'inactive'}`}
                onClick={() => setActiveCat(cat)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <select className="gallery-sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="name">A–Z</option>
          </select>
        </div>

        <div className="gallery-result-count">
          {filtered.length} design{filtered.length !== 1 ? 's' : ''} found
        </div>

        {/* Grid / Empty */}
        {loading ? (
          <div className="gallery-empty">
            <h3 className="gallery-empty__title">Loading shared designs…</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="gallery-empty">
            <div className="gallery-empty__icon">🏠</div>
            <h3 className="gallery-empty__title">No designs found</h3>
            <p className="gallery-empty__sub">Try adjusting your search or filters</p>
            <button className="gallery-empty__clear" onClick={() => { setSearch(''); setActiveCat('all') }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filtered.map((project, idx) => (
              <div key={project._id} className="gallery-card" onClick={() => handleOpen(project)}>

                <div className="gallery-card__thumb gallery-card__thumb--3d"
                  style={{ background: ROOM_GRADIENTS[idx % ROOM_GRADIENTS.length] }}>

                  {project.thumbnail
                    ? <img className="gallery-card__img gallery-card__img--3d" src={project.thumbnail} alt={project.name} />
                    : (
                      <div className="gallery-card__placeholder">
                        <span className="gallery-card__placeholder-emoji">
                          {ROOM_EMOJIS[idx % ROOM_EMOJIS.length]}
                        </span>
                        <div className="gallery-card__placeholder-tags">
                          {(project.tags||[]).map(tag => (
                            <span key={tag} className="gallery-card__tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  <div className="gallery-card__viewport-tag">3D Interface</div>

                  <div className="gallery-card__overlay">
                    <button className="gallery-card__overlay-btn" onClick={e => { e.stopPropagation(); handleOpen(project) }}>
                      🧊 Open 3D Interface
                    </button>
                  </div>

                  <div className="gallery-card__cat-badge">3D</div>
                  {project.owner?._id === user?._id && <div className="gallery-card__mine-badge">Mine</div>}
                </div>

                <div className="gallery-card__body">
                  <div className="gallery-card__row">
                    <div>
                      <div className="gallery-card__name">{project.name}</div>
                      <div className="gallery-card__author">by {project.owner?.name || 'Unknown'}</div>
                    </div>
                    <button className="gallery-card__like-btn" onClick={e => toggleLike(e, project._id)}>
                      <span className="gallery-card__like-icon">{liked[project._id] ? '❤️' : '🤍'}</span>
                      <span className={`gallery-card__like-count gallery-card__like-count--${liked[project._id] ? 'active' : 'inactive'}`}>
                        {(project.likes||0) + (liked[project._id] ? 1 : 0)}
                      </span>
                    </button>
                  </div>
                  <div className="gallery-card__footer">
                    <span className="gallery-card__views">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    <button className="gallery-card__open-btn" onClick={e => { e.stopPropagation(); handleOpen(project) }}>
                      Open 3D →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}