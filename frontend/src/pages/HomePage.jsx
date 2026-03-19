import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { PencilRuler, Box, Armchair, Camera, Users, Share2 } from 'lucide-react'
import '../styles/pages/HomePage.css'

const HeroRoomPreview = lazy(() => import('../components/home/HeroRoomPreview'))

const features = [
  { Icon:PencilRuler, title:'2D Floor Plan Editor',   desc:'Draw walls, add doors & windows with pixel-perfect snap-to-grid precision.' },
  { Icon:Box,         title:'Real-Time 3D Preview',    desc:'Instantly see your floor plan in stunning 3D — no loading required.' },
  { Icon:Armchair,    title:'10,000+ Furniture Items', desc:'Browse top brands, filter by style, size, color and drag onto your plan.' },
  { Icon:Camera,      title:'HD Rendering',            desc:'Generate photorealistic renders to share with clients or family.' },
  { Icon:Users,       title:'Collaboration',           desc:'Invite others to co-design in real-time with live cursors and comments.' },
  { Icon:Share2,      title:'Export & Share',          desc:'PDF floor plans, shopping lists, and a public share link.' },
]

const stats = [
  { value:'4M+',  label:'Designs Created' },
  { value:'120+', label:'Countries' },
  { value:'10K+', label:'Furniture Items' },
  { value:'98%',  label:'Satisfaction' },
]

const steps = [
  { step:'01', title:'Draw your floor plan', desc:'Use our intuitive 2D editor to draw walls, add rooms and define your space.', color:'#6c63ff' },
  { step:'02', title:'Add furniture & style', desc:'Browse 10,000+ items and drag them into your plan. Apply textures and colors.', color:'#43d9ad' },
  { step:'03', title:'See it in 3D', desc:'Switch to 3D view instantly and walk through your dream home in real time.', color:'#ff6b6b' },
]

const avatarColors = ['#6c63ff','#43d9ad','#ff6b6b','#ffaa44','#60a5fa']

export default function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((s) => s.auth)
  const [shouldRender3D, setShouldRender3D] = useState(false)
  const go = () => navigate(isAuthenticated ? '/editor' : '/register')

  useEffect(() => {
    let idleId = null
    let timeoutId = null

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => setShouldRender3D(true), { timeout: 1300 })
      return () => window.cancelIdleCallback(idleId)
    }

    timeoutId = window.setTimeout(() => setShouldRender3D(true), 700)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div className="hp">

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-hero__bg">
          <div className="hp-hero__blob1" />
          <div className="hp-hero__blob2" />
          <div className="hp-hero__blob3" />
          <div className="hp-hero__grid" />
        </div>

        <div className="hp-hero__content">
          <div className="hp-hero__badge">
            <span className="hp-hero__badge-dot" />
            Free to start — no credit card required
          </div>

          <h1 className="hp-hero__title">
            Design your
            <span className="hp-hero__title-gradient">dream home</span>
            <span className="hp-hero__title-sub">in 3D</span>
          </h1>

          <p className="hp-hero__subtitle">
            The most powerful free online floor plan and home design tool.
            Draw in 2D and watch it come alive in stunning 3D instantly.
          </p>

          <div className="hp-hero__actions">
            <button className="hp-btn-primary" onClick={go}>✦ Start Designing Free</button>
            <button className="hp-btn-secondary" onClick={() => navigate('/catalog')}>Browse Furniture →</button>
          </div>

          <div className="hp-hero__proof">
            <div className="hp-hero__avatars">
              {avatarColors.map((c, i) => (
                <div key={i} className="hp-hero__avatar"
                  style={{ background:`linear-gradient(135deg,${c},${c}88)`, marginLeft: i ? -8 : 0, zIndex: 5 - i }} />
              ))}
            </div>
            <span className="hp-hero__proof-text">
              Loved by <strong>4M+ designers</strong> worldwide
            </span>
          </div>

          {shouldRender3D ? (
            <Suspense fallback={<div className="hp-room hp-room--fallback" />}>
              <HeroRoomPreview />
            </Suspense>
          ) : (
            <div className="hp-room hp-room--fallback" />
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="hp-stats">
        <div className="hp-stats__grid">
          {stats.map(s => (
            <div key={s.label} className="hp-stat">
              <div className="hp-stat__value">{s.value}</div>
              <div className="hp-stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="hp-features">
        <div className="hp-features__inner">
          <div className="hp-features__header">
            <span className="hp-features__tag">Features</span>
            <h2 className="hp-features__title">Everything you need to design</h2>
            <p className="hp-features__sub">Professional tools made simple, completely free.</p>
          </div>
          <div className="hp-features__grid">
            {features.map(f => (
              <div key={f.title} className="hp-feature-card">
                <div className="hp-feature-card__corner" />
                <div className="hp-feature-card__icon">{f.Icon && <f.Icon size={34} strokeWidth={2.1} />}</div>
                <h3 className="hp-feature-card__title">{f.title}</h3>
                <p className="hp-feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="hp-steps">
        <div className="hp-steps__inner">
          <h2 className="hp-steps__title">Design in 3 simple steps</h2>
          <div className="hp-steps__grid">
            {steps.map(s => (
              <div key={s.step} className="hp-step">
                <div className="hp-step__num" style={{ color: `${s.color}20` }}>{s.step}</div>
                <div className="hp-step__bar" style={{ background: s.color }} />
                <h3 className="hp-step__title">{s.title}</h3>
                <p className="hp-step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hp-cta">
        <div className="hp-cta__inner">
          <div className="hp-cta__blob1" />
          <div className="hp-cta__blob2" />
          <div className="hp-cta__body">
            <h2 className="hp-cta__title">Ready to design your<br />dream home?</h2>
            <p className="hp-cta__sub">Join 4 million designers. Free forever, no credit card needed.</p>
            <button className="hp-btn-cta" onClick={go}>Get Started Free →</button>
          </div>
        </div>
      </section>

    </div>
  )
}