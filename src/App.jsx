import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ClientasPage } from './pages/ClientasPage'
import { ServiciosPage } from './pages/ServiciosPage'
import { CitasPage } from './pages/CitasPage'
import { ProductosPage } from './pages/ProductosPage'
import { ComprasPage } from './pages/ComprasPage'
import { IngresosPage } from './pages/IngresosPage'
import { GastosPage } from './pages/GastosPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/clientas" element={<ClientasPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/citas" element={<CitasPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/ingresos" element={<IngresosPage />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/" element={<Navigate to="/clientas" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
