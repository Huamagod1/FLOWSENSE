import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axiosConfig'
import { useAuth } from '../hooks/useAuth'

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [recintos, setRecintos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/recintos')
      .then(res => setRecintos(res.data))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const recientes = recintos.slice(0, 5)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Bienvenido, {usuario?.nombre}</h2>
          <p className="text-muted">Panel de control FlowSense</p>
        </div>
        <Link to="/app/recintos" className="btn btn-primary">+ Nuevo recinto</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{recintos.length}</div>
          <div className="stat-label">Total recintos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">—</div>
          <div className="stat-label">Análisis completados</div>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Recintos recientes</h3>
        {cargando ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : recientes.length === 0 ? (
          <div className="empty-state">
            <p>Aún no tienes recintos. <Link to="/app/recintos" className="link">Crea el primero.</Link></p>
          </div>
        ) : (
          <div className="card-list">
            {recientes.map(r => (
              <Link key={r.id} to={`/app/recintos/${r.id}`} className="card-item">
                <div className="card-item-main">
                  <strong>{r.nombre}</strong>
                  <span className="badge">{r.tipo}</span>
                </div>
                <span className="card-item-sub">{r.direccion}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
