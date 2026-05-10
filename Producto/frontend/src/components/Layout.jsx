import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_LINKS = [
  { to: '/app', label: 'Dashboard', exact: true },
  { to: '/app/recintos', label: 'Recintos' },
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">⬡</span>
          <span className="navbar-title">FlowSense</span>
        </div>
        <div className="navbar-user">
          <span className="navbar-username">{usuario?.nombre} {usuario?.apellido}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <div className="layout-body">
        <aside className="sidebar">
          <nav>
            {NAV_LINKS.map(({ to, label, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to)
              return (
                <Link key={to} to={to} className={`sidebar-link${active ? ' active' : ''}`}>
                  {label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
