import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table, Tag, Button } from 'antd'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'

const ESTADO_LABELS = {
  PENDIENTE: { text: 'Pendiente', color: 'default' },
  PROCESANDO: { text: 'Procesando', color: 'processing' },
  FRAME_LISTO: { text: 'Frame listo', color: 'warning' },
  COMPLETADO: { text: 'Completado', color: 'success' },
  ERROR: { text: 'Error', color: 'error' },
}

export default function RecintoDetallePage() {
  const { id } = useParams()
  const [recinto, setRecinto] = useState(null)
  const [videos, setVideos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const hayProcesando = videos.some(v => v.estado === 'PROCESANDO' || v.estado === 'PENDIENTE')

  useEffect(() => {
    api.get(`/recintos/${id}`)
      .then(res => setRecinto(res.data))
      .catch(() => setError('No se pudo cargar el recinto'))
      .finally(() => setCargando(false))
    cargarVideos()
  }, [id])

  function cargarVideos() {
    api.get(`/recintos/${id}/videos`).then(res => setVideos(res.data || [])).catch(() => {})
  }

  usePolling(cargarVideos, 5000, hayProcesando)

  const columns = [
    { title: 'Archivo', dataIndex: 'nombre_archivo', key: 'nombre', render: t => t || '—' },
    { title: 'Estado', dataIndex: 'estado', key: 'estado',
      render: estado => {
        const cfg = ESTADO_LABELS[estado] || { text: estado, color: 'default' }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      }
    },
    { title: 'Acciones', key: 'acciones',
      render: (_, row) => (
        <div className="table-actions">
          {row.estado === 'COMPLETADO' && (
            <Link to={`/app/analisis/${row.id}`}><Button size="small" type="primary">Ver resultados</Button></Link>
          )}
          {(row.estado === 'FRAME_LISTO' || row.estado === 'PENDIENTE') && (
            <Link to={`/app/videos/${row.id}/zonas`}><Button size="small">Definir zonas</Button></Link>
          )}
        </div>
      )
    },
  ]

  if (cargando) return <div className="page"><div className="spinner-wrap"><div className="spinner" /></div></div>
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/app/recintos" className="link">Recintos</Link> / {recinto?.nombre}
          </div>
          <h2>{recinto?.nombre}</h2>
          <p className="text-muted">{recinto?.tipo} · {recinto?.direccion}</p>
        </div>
        <Link to={`/app/recintos/${id}/analizar`}>
          <Button type="primary">+ Analizar nuevo video</Button>
        </Link>
      </div>

      <div className="section">
        <h3 className="section-title">Historial de videos</h3>
        {hayProcesando && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            Hay videos en procesamiento. Actualizando automáticamente...
          </div>
        )}
        <Table
          dataSource={videos}
          columns={columns}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'Aún no hay videos analizados' }}
        />
      </div>
    </div>
  )
}
