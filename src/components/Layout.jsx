import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BottomNav } from './BottomNav'
import {
  IconAgenda,
  IconClientas,
  IconServicios,
  IconFinanzas,
  IconCompras,
  IconGaleria,
  IconReservar,
  IconMisCitas,
} from './icons'

const ADMIN_ITEMS = [
  { to: '/app/agenda', label: 'Agenda', Icon: IconAgenda },
  { to: '/app/clientas', label: 'Clientas', Icon: IconClientas },
  { to: '/app/servicios', label: 'Servicios', Icon: IconServicios },
  { to: '/app/finanzas', label: 'Finanzas', Icon: IconFinanzas },
  { to: '/app/compras', label: 'Compras', Icon: IconCompras },
  { to: '/app/galeria', label: 'Galería', Icon: IconGaleria },
]

const CLIENT_ITEMS = [
  { to: '/portal/reservar', label: 'Reservar', Icon: IconReservar },
  { to: '/portal/mis-citas', label: 'Mis citas', Icon: IconMisCitas },
]

function TopBar({ title }) {
  const { signOut, session } = useAuth()

  return (
    <header className="app-topbar">
      <span className="app-topbar-title">{title}</span>
      <div className="app-topbar-user">
        <span className="app-topbar-email">{session?.user?.email}</span>
        <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
          Salir
        </button>
      </div>
    </header>
  )
}

export function AdminLayout() {
  return (
    <div className="app-shell">
      <TopBar title="Maquillaje App" />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav items={ADMIN_ITEMS} />
    </div>
  )
}

export function ClientLayout() {
  return (
    <div className="app-shell">
      <TopBar title="Maquillaje App" />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav items={CLIENT_ITEMS} />
    </div>
  )
}
