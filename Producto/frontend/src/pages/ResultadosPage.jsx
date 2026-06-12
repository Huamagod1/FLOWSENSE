import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Spin, Alert, Tabs, Card } from 'antd'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'
import TrayectoriasCanvas from '../components/TrayectoriasCanvas'
import FlujoSankeyChart from '../components/FlujoSankeyChart'
import MetricasTrackingPanel from '../components/MetricasTrackingPanel'
import { getTracks, getFlujoZonas, getMetricasTracking } from '../api/tracking'
import VideoValidacion from '../components/VideoValidacion'
import ResumenEjecutivo from '../components/ResumenEjecutivo'
import RecomendacionPrecio from '../components/RecomendacionPrecio'
import AnalisisDetallado from '../components/AnalisisDetallado'
import { getConfiabilidad } from '../api/validacion'

export default function ResultadosPage() {
  const { id } = useParams()

  const [estado, setEstado] = useState('PROCESANDO')
  const [mensajeError, setMensajeError] = useState('')
  const [detecciones, setDetecciones] = useState([])
  const [metricas, setMetricas] = useState([])
  const [metricasTemporales, setMetricasTemporales] = useState([])
  const [frameSrc, setFrameSrc] = useState(null)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [zones, setZones] = useState([])
  const [tracks, setTracks] = useState([])
  const [flujoZonas, setFlujoZonas] = useState([])
  const [metricasTracking, setMetricasTracking] = useState([])
  const [confiabilidad, setConfiabilidad] = useState(null)
  const [activeTab, setActiveTab] = useState('validacion')

  const pollingActivo = estado !== 'COMPLETADO' && estado !== 'ERROR'

  async function consultarEstado() {
    try {
      const res = await api.get(`/videos/${id}/estado`)
      setEstado(res.data.estado)
      if (res.data.estado === 'ERROR')
        setMensajeError(res.data.mensajeError || res.data.mensaje_error || 'Error en el análisis')
    } catch {
      setMensajeError('No se pudo consultar el estado del análisis')
      setEstado('ERROR')
    }
  }

  usePolling(consultarEstado, 3000, pollingActivo)
  useEffect(() => { consultarEstado() }, [id])

  useEffect(() => {
    if (estado !== 'COMPLETADO') return
    api.get(`/videos/${id}/detecciones`).then(r => setDetecciones(r.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas`).then(r => setMetricas(r.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas-temporales`).then(r => setMetricasTemporales(r.data || [])).catch(() => {})
    api.get(`/videos/${id}/zonas`).then(r => setZones(r.data || [])).catch(() => {})
    getTracks(id).then(r => setTracks(r.data || [])).catch(() => {})
    getFlujoZonas(id).then(r => setFlujoZonas(r.data || [])).catch(() => {})
    getMetricasTracking(id).then(r => setMetricasTracking(r.data || [])).catch(() => {})
    getConfiabilidad(id).then(r => setConfiabilidad(r.data)).catch(() => {})
  }, [estado, id])

  useEffect(() => {
    if (estado !== 'COMPLETADO') return
    let url = null
    api.get(`/videos/${id}/frame-preview/imagen`, { responseType: 'blob' })
      .then(r => { url = URL.createObjectURL(r.data); setFrameSrc(url) })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [estado, id])

  if (estado === 'ERROR') {
    return (
      <div className="page">
        <div className="page-header"><h2>Resultados del análisis</h2></div>
        <div className="alert alert-error">{mensajeError || 'Error en el análisis'}</div>
        <Link to="/app" className="btn btn-ghost" style={{ marginTop: 16 }}>Volver al inicio</Link>
      </div>
    )
  }

  if (pollingActivo) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Resultados del análisis</h2>
          <p className="text-muted">Video ID: {id}</p>
        </div>
        <div className="spinner-wrap" style={{ flexDirection: 'column', gap: 16, padding: '80px 0' }}>
          <Spin size="large" />
          <p className="text-muted">Analizando video... Por favor espera.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>Resultados del análisis</h2>
          <p className="text-muted" style={{ margin: 0 }}>Video ID: {id}</p>
        </div>
      </div>

      {mensajeError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>{mensajeError}</div>
      )}

      {bannerVisible && (
        <Alert
          type="info"
          showIcon
          closable
          onClose={() => setBannerVisible(false)}
          style={{ marginBottom: 16 }}
          message="Análisis de tráfico peatonal"
          description="Este reporte mide el comportamiento real de personas usando tracking individual (ByteTrack). Las métricas principales son personas únicas (sin doble conteo), permanencia promedio por zona y flujo entre zonas. Estos datos respaldan la recomendación de precios por zona."
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyInactiveTabPane={false}
        items={[
          {
            key: 'validacion',
            label: 'Validación del análisis',
            children: (
              <VideoValidacion videoId={id} confiabilidad={confiabilidad} />
            ),
          },
          {
            key: 'resumen',
            label: 'Resumen',
            children: (
              <ResumenEjecutivo metricas={metricas} />
            ),
          },
          {
            key: 'precio',
            label: 'Recomendación de precio',
            children: (
              <RecomendacionPrecio metricas={metricas} videoId={id} />
            ),
          },
          {
            key: 'detalle',
            label: 'Análisis detallado',
            children: (
              <AnalisisDetallado
                metricas={metricas}
                metricasTemporales={metricasTemporales}
                detecciones={detecciones}
                frameSrc={frameSrc}
                zones={zones}
              />
            ),
          },
          {
            key: 'flujo',
            label: 'Flujo y trayectorias',
            children: (
              <div>
                <div className="section">
                  <Card>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>
                      Trayectorias y zonas
                    </h3>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
                      Las burbujas muestran el número de personas únicas por zona. Las flechas indican flujo entre zonas.
                    </p>
                    <TrayectoriasCanvas
                      frameSrc={frameSrc}
                      zones={zones}
                      metricas={metricas}
                      flujoZonas={flujoZonas}
                      tracks={tracks}
                    />
                  </Card>
                </div>

                {flujoZonas.length > 0 && (
                  <div className="section">
                    <Card>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>
                        Flujo entre zonas
                      </h3>
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                        Trayectorias que conectan zonas distintas. Identifica rutas de circulación frecuentes.
                      </p>
                      <FlujoSankeyChart flujoZonas={flujoZonas} zones={zones} />
                    </Card>
                  </div>
                )}

                <div className="section">
                  <MetricasTrackingPanel
                    metricas={metricas}
                    metricasTracking={metricasTracking}
                    zones={zones}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
