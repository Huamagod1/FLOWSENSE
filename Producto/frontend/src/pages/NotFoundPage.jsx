import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>404</div>
        <h2>Página no encontrada</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          La página que buscas no existe o fue eliminada.
        </p>
        <Link to="/app" className="btn btn-primary">Ir al inicio</Link>
      </div>
    </div>
  )
}
