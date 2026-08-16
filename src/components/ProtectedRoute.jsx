import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ role, children }) {
  const { session, loading, role: currentRole } = useAuth()

  if (loading) {
    return <p className="loading">Cargando…</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'clienta' ? '/portal/reservar' : '/app/agenda'} replace />
  }

  return children
}
