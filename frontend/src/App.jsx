import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { ProtectedRoute, AdminRoute, GuestRoute, PublicRoute } from './components/guards/Routeguards'

// Client pages
import HomePage             from './pages/HomePage'
import LoginPage            from './pages/LoginPage'
import RegisterPage         from './pages/RegisterPage'
import DashboardPage        from './pages/DashboardPage'
import EditorPage           from './pages/EditorPage'
import FurnitureCatalogPage from './pages/FurnitureCatalogPage'
import GalleryPage          from './pages/GalleryPage'

// Admin pages
import AdminLoginPage from './pages/Adminloginpage'
import AdminPage      from './pages/Adminpage'

export default function App() {
  return (
    <Routes>

      {/* CLIENT ROUTES */}
      <Route path="/" element={<Layout />}>

        {/* Public pages — admin gets redirected to /admin */}
        <Route index           element={<PublicRoute><HomePage /></PublicRoute>} />
        <Route path="gallery"  element={<PublicRoute><GalleryPage /></PublicRoute>} />
        <Route path="catalog"  element={<PublicRoute><FurnitureCatalogPage /></PublicRoute>} />

        {/* Auth pages — redirect if already logged in */}
        <Route path="login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected client-only pages */}
        <Route path="dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="editor/:projectId?" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />

      </Route>

      {/* ADMIN ROUTES — completely separate, no Layout */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin"       element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/admin/*"     element={<AdminRoute><AdminPage /></AdminRoute>} />


    </Routes>
  )
}