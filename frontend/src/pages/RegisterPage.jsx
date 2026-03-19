import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { register as registerUser } from '../store/slices/authSlice'
import '../styles/pages/LoginPage.css'
import '../styles/pages/RegisterPage.css'

const schema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters'),
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match", path: ['confirmPassword'],
})

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth)
  useEffect(() => { if (isAuthenticated) navigate('/dashboard') }, [isAuthenticated, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = (data) => dispatch(registerUser({ name: data.name, email: data.email, password: data.password }))

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo-wrap">
          <div className="auth-logo register-logo">H</div>
          <h1>Create your account</h1>
          <p>Start designing for free today</p>
          <div className="register-benefits">
            {['Free forever', 'No credit card', 'Unlimited projects'].map(b => (
              <span key={b} className="register-benefit"><span className="register-benefit-dot">✓</span>{b}</span>
            ))}
          </div>
        </div>
        <div className="auth-card">
          {error && <div className="auth-error">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="auth-field">
              <label>Full Name</label>
              <input {...register('name')} type="text" placeholder="John Doe" className={errors.name ? 'error' : ''} />
              {errors.name && <span className="auth-field__err">{errors.name.message}</span>}
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input {...register('email')} type="email" placeholder="hello@example.com" className={errors.email ? 'error' : ''} />
              {errors.email && <span className="auth-field__err">{errors.email.message}</span>}
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input {...register('password')} type="password" placeholder="••••••••" className={errors.password ? 'error' : ''} />
              {errors.password && <span className="auth-field__err">{errors.password.message}</span>}
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input {...register('confirmPassword')} type="password" placeholder="••••••••" className={errors.confirmPassword ? 'error' : ''} />
              {errors.confirmPassword && <span className="auth-field__err">{errors.confirmPassword.message}</span>}
            </div>
            <button type="submit" className="auth-submit-green" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>
          <p className="auth-footer">
            Already have an account?{' '}<Link to="/login">Sign in</Link>
          </p>
        </div>
        <div className="auth-back"><Link to="/">← Back to homepage</Link></div>
      </div>
    </div>
  )
}
