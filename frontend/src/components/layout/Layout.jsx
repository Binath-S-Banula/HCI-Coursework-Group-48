import { useState } from 'react'
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
                  <div className="navbar__avatar-wrap" onBlur={() => setTimeout(() => setDropOpen(false), 150)}>
                    <button className="navbar__avatar" onClick={() => setDropOpen(!dropOpen)}>
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </button>
                    {dropOpen && (
                      <div className="navbar__dropdown">
                        <div className="navbar__dropdown-email">{user?.email}</div>
                        <button className="navbar__dropdown-item" onClick={() => { navigate('/dashboard'); setDropOpen(false) }}>Dashboard</button>
                        <button className="navbar__dropdown-item" onClick={() => { handleNewDesign(); setDropOpen(false) }}>New Design</button>
                        <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={() => { dispatch(logout()); setDropOpen(false) }}>Sign Out</button>
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
            <Link to="/" className="footer__brand">
              <img src={logoImage} alt="HomePlan3D Logo" className="footer__brand-image" />
            </Link>
            <span className="footer__copy">©️ {new Date().getFullYear()} HomePlan3D. All rights reserved.</span>
          </div>
        </footer>
      )}

    </div>
  )
}