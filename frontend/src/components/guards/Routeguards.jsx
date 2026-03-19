import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// Only logged-in CLIENTS — blocks admins → sends to /admin
export function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth)
  if (!isAuthenticated)          return <Navigate to="/login" replace />
  if (user?.role === 'admin')    return <Navigate to="/admin" replace />
  return children
}

// Only ADMINS — blocks clients → sends to /dashboard
export function AdminRoute({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth)
  if (!isAuthenticated)          return <Navigate to="/admin/login" replace />
  if (user?.role !== 'admin')    return <Navigate to="/dashboard" replace />
  return children
}

// Block already logged-in users from seeing login/register
export function GuestRoute({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth)
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  return children
}

// Wrap any PUBLIC page — if admin is logged in, redirect to /admin
export function PublicRoute({ children }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth)
  if (isAuthenticated && user?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  return children
}