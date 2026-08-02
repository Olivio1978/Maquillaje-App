import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout() {
  const { signOut, session } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Maquillaje App</span>
        <nav>
          <NavLink to="/clientas" className={({ isActive }) => (isActive ? 'active' : '')}>
            Clientas
          </NavLink>
        </nav>
        <div className="app-user">
          <span>{session?.user?.email}</span>
          <button type="button" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
