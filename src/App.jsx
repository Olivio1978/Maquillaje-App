import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout, ClientLayout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { AgendaPage } from './pages/AgendaPage'
import { ClientasPage } from './pages/ClientasPage'
import { ServiciosPage } from './pages/ServiciosPage'
import { FinanzasPage } from './pages/FinanzasPage'
import { ComprasPage } from './pages/ComprasPage'
import { GaleriaPage } from './pages/GaleriaPage'
import { ReservarPage } from './pages/ReservarPage'
import { MisCitasPage } from './pages/MisCitasPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="clientas" element={<ClientasPage />} />
            <Route path="servicios" element={<ServiciosPage />} />
            <Route path="finanzas" element={<FinanzasPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="galeria" element={<GaleriaPage />} />
            <Route index element={<Navigate to="agenda" replace />} />
          </Route>

          <Route
            path="/portal"
            element={
              <ProtectedRoute role="clienta">
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route path="reservar" element={<ReservarPage />} />
            <Route path="mis-citas" element={<MisCitasPage />} />
            <Route index element={<Navigate to="reservar" replace />} />
          </Route>

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RoleRedirect() {
  const { role } = useAuth()
  return <Navigate to={role === 'clienta' ? '/portal/reservar' : '/app/agenda'} replace />
}

export default App
