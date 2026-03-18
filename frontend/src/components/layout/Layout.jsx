import { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { projectService } from '../../services/project.service'
import logoImage from '../../uploads/homeland-logo.png'
import '../../styles/components/Layout.css'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useSelector((s) => s.auth)
  const isEditor = location.pathname.startsWith('/editor')
  const [dropOpen, setDropOpen] = useState(false)
  const avatarWrapRef = useRef(null)

  useEffect(() => {
    if (!dropOpen) return
    const handleOutsideClick = (event) => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(event.target)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [dropOpen])

  const handleSignOut = useCallback(() => {
    setDropOpen(false)
    dispatch(logout())
    localStorage.removeItem('homeplan3d_pendingFurniture')
    navigate('/login', { replace: true })
  }, [dispatch, navigate])

  const handleNewDesign = async () => {
    try {
      const newProject = await projectService.create({ name: 'New Project' })
      navigate(`/editor/${newProject._id}`)
    } catch {
      navigate('/editor')
    }
  }

  const linkClass = (path) =>
    location.pathname === path ? 'navbar__link navbar__link--active' : 'navbar__link'

  return (
    <div className="layout">

      {/* ── NAVBAR ── */}
      {!isEditor && (
        <nav className="navbar">
          <div className="navbar__inner">

            {/* Logo */}
            <Link to="/" className="navbar__logo">
              <img src={logoImage} alt="HomePlan3D Logo" className="navbar__logo-image" />
            </Link>

            {/* Links */}
            <div className="navbar__links">
              <Link to="/"        className={linkClass('/')}>Home</Link>
              <Link to="/gallery" className={linkClass('/gallery')}>Gallery</Link>
              <Link to="/catalog" className={linkClass('/catalog')}>Furniture</Link>
            </div>

            {/* Right */}
            <div className="navbar__actions">
              {isAuthenticated ? (
                <>
                  <button className="navbar__btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
                  <button className="navbar__btn-primary" onClick={handleNewDesign}>+ New Design</button>

                  {/* Avatar + dropdown */}
                  <div className="navbar__avatar-wrap" ref={avatarWrapRef}>
                    <button className="navbar__avatar" onClick={() => setDropOpen(!dropOpen)}>
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </button>
                    {dropOpen && (
                      <div className="navbar__dropdown">
                        <div className="navbar__dropdown-email">{user?.email}</div>
                        <button
                          className="navbar__dropdown-item"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { navigate('/dashboard'); setDropOpen(false) }}
                        >
                          Dashboard
                        </button>
                        <button
                          className="navbar__dropdown-item"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { handleNewDesign(); setDropOpen(false) }}
                        >
                          New Design
                        </button>
                        <button
                          className="navbar__dropdown-item navbar__dropdown-item--danger"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={handleSignOut}
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button className="navbar__btn-ghost"   onClick={() => navigate('/login')}>Sign In</button>
                  <button className="navbar__btn-primary" onClick={() => navigate('/register')}>Get Started Free</button>
                </>
              )}
            </div>

          </div>
        </nav>
      )}

      {/* ── CONTENT ── */}
      <main className="layout__main">
        <Outlet />
      </main>

      {/* ── FOOTER ── */}
      {!isEditor && (
        <footer className="footer">
          <div className="footer__inner">
            <div className="footer__grid">
              <div className="footer__col footer__col--brand">
                <Link to="/" className="footer__brand">
                  <img src={logoImage} alt="HomePlan3D Logo" className="footer__brand-image" />
                </Link>
                <p className="footer__desc">
                  Design floor plans, visualize spaces in 3D, and share your projects with the community.
                </p>
              </div>

              <div className="footer__col">
                <h4 className="footer__heading">Explore</h4>
                <div className="footer__links">
                  <Link to="/" className="footer__link">Home</Link>
                  <Link to="/gallery" className="footer__link">Gallery</Link>
                  <Link to="/catalog" className="footer__link">Furniture</Link>
                </div>
              </div>

              <div className="footer__col">
                <h4 className="footer__heading">Account</h4>
                <div className="footer__links">
                  {isAuthenticated ? (
                    <>
                      <Link to="/dashboard" className="footer__link">Dashboard</Link>
                      <button className="footer__link footer__link-btn" onClick={handleNewDesign}>New Design</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="footer__link">Sign In</Link>
                      <Link to="/register" className="footer__link">Get Started</Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="footer__bottom">
              <span className="footer__copy">© {new Date().getFullYear()} HomePlan3D. All rights reserved.</span>
            </div>
          </div>
        </footer>
      )}

    </div>
  )
}