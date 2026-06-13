# Producto/frontend/src/components/MetricasTrackingPanel.jsx

```jsx
import { Card, Statistic, Row, Col, Table } from 'antd'

const PRIMARY = '#7C3AED'
const fmt1 = n => (n != null ? n.toFixed(1) : '—')

export default function MetricasTrackingPanel({ metricas = [], metricasTracking = [], zones = [] }) {
  const totalPersonasUnicas = metricas.reduce((s, m) => s + (m.personasUnicas || 0), 0)
  const totalEntradas = metricas.reduce((s, m) => s + (m.entradas || 0), 0)
  const totalOts = metricas.reduce((s, m) => s + (m.otsTracking || 0), 0)

  const withPerm = metricas.filter(m => m.tiempoPermanenciaProm != null)
  const avgPermanencia = withPerm.length
    ? withPerm.reduce((s, m) => s + m.tiempoPermanenciaProm, 0) / withPerm.length
    : null

  const hayTracking = metricas.some(m => m.personasUnicas != null && m.personasUnicas > 0)

  if (!hayTracking) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Sin datos de tracking disponibles. Este video fue procesado sin ByteTrack o no se detectaron trayectorias.
      </div>
    )
  }

  const columnas = [
    {
      title: 'Zona',
      key: 'zona',
      render: (_, m) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.colorHexZona || PRIMARY, flexShrink: 0 }} />
          {m.nombreZona}
        </span>
      ),
    },
    {
      title: 'Personas únicas',
      dataIndex: 'personasUnicas',
      key: 'personasUnicas',
      render: v => (v != null ? v : '—'),
      sorter: (a, b) => (a.personasUnicas || 0) - (b.personasUnicas || 0),
    },
    {
      title: 'Permanencia prom. (s)',
      dataIndex: 'tiempoPermanenciaProm',
      key: 'tiempoPermanenciaProm',
      render: v => (v != null ? fmt1(v) : '—'),
      sorter: (a, b) => (a.tiempoPermanenciaProm || 0) - (b.tiempoPermanenciaProm || 0),
    },
    {
      title: 'Entradas',
      dataIndex: 'entradas',
      key: 'entradas',
      render: v => (v != null ? v : '—'),
      sorter: (a, b) => (a.entradas || 0) - (b.entradas || 0),
    },
    {
      title: 'Salidas',
      dataIndex: 'salidas',
      key: 'salidas',
      render: v => (v != null ? v : '—'),
      sorter: (a, b) => (a.salidas || 0) - (b.salidas || 0),
    },
    {
      title: 'OTS tracking',
      dataIndex: 'otsTracking',
      key: 'otsTracking',
      render: v => (v != null ? Math.round(v) : '—'),
      sorter: (a, b) => (a.otsTracking || 0) - (b.otsTracking || 0),
    },
    {
      title: 'Vel. flujo prom.',
      dataIndex: 'velocidadFlujoProm',
      key: 'velocidadFlujoProm',
      render: v => (v != null ? fmt1(v) : '—'),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
            <Statistic
              title="Personas únicas totales"
              value={totalPersonasUnicas || '—'}
              valueStyle={{ color: PRIMARY, fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>sin doble conteo (ByteTrack)</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #16a34a' }}>
            <Statistic
              title="Permanencia promedio"
              value={avgPermanencia != null ? fmt1(avgPermanencia) : '—'}
              suffix={avgPermanencia != null ? 's' : ''}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>segundos por persona</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #d97706' }}>
            <Statistic
              title="Total entradas"
              value={totalEntradas || '—'}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>cruces de zona detectados</p>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #0ea5e9' }}>
            <Statistic
              title="OTS sin doble conteo"
              value={totalOts > 0 ? Math.round(totalOts) : '—'}
              valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>persona-segundos únicos</p>
          </Card>
        </Col>
      </Row>

      <Card>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#111827' }}>Métricas de tracking por zona</h4>
        <Table
          dataSource={metricas}
          columns={columnas}
          rowKey="idZona"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
```

# Producto/frontend/src/components/RecomendacionPrecio.jsx

```jsx
import { useState } from 'react'
import { Card, Input, Button, Row, Col } from 'antd'
import api from '../api/axiosConfig'

const PRIMARY = '#7C3AED'
const clp = n => `$${Number(n).toLocaleString('es-CL')}`

function getTipoZona(score) {
  if (score >= 1.5) return { tipo: 'Premium',   color: '#16a34a', bg: '#f0fdf4' }
  if (score >= 1.0) return { tipo: 'Estándar',  color: PRIMARY,  bg: '#f5f3ff' }
  if (score >= 0.8) return { tipo: 'Estándar',  color: '#d97706', bg: '#fffbeb' }
  return              { tipo: 'Bajo',       color: '#ea580c', bg: '#fff7ed' }
}

function justificacion(m, avgDet) {
  const ratio = avgDet > 0 ? m.totalDetecciones / avgDet : 1
  const tasa  = m.tasaDetencion != null ? m.tasaDetencion * 100 : null
  if (ratio >= 1.5 && tasa != null && tasa >= 40)
    return 'Alto tráfico + alta permanencia. Zona destino — premium justificado.'
  if (ratio >= 1.5)
    return 'Buena exposición, tráfico sobre el promedio del recinto.'
  if (ratio >= 0.8)
    return 'Promedio del recinto. Precio base recomendado.'
  return 'Zona de baja actividad. Considerar incentivos o ajuste a la baja.'
}

function ScoreGauge({ score, color }) {
  const r = 28, circ = 2 * Math.PI * r
  const pct = Math.min(Math.max(score, 0) / 2.5, 1)
  return (
    <svg width="70" height="70" viewBox="0 0 70 70" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="35" cy="35" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 35 35)" />
      <text x="35" y="39" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
        {score.toFixed(2)}
      </text>
    </svg>
  )
}

export default function RecomendacionPrecio({ metricas, videoId }) {
  const [precioBase, setPrecioBase]     = useState('')
  const [precios, setPrecios]           = useState([])
  const [calculando, setCalculando]     = useState(false)
  const [errorMsg, setErrorMsg]         = useState(null)

  if (!metricas?.length) return null

  const totalDet = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const avgDet   = metricas.length ? totalDet / metricas.length : 0

  async function calcular() {
    if (!precioBase) return
    setCalculando(true)
    setErrorMsg(null)
    try {
      const res = await api.post(`/videos/${videoId}/precio-sugerido`, {
        precioBase: Number(precioBase),
      })
      setPrecios(res.data || [])
    } catch {
      setErrorMsg('Error al calcular precios. Verifica la conexión e inténtalo de nuevo.')
    } finally {
      setCalculando(false)
    }
  }

  const tablaData = metricas.map(m => {
    const p = precios.find(p => p.idZona === m.idZona || p.nombreZona === m.nombreZona)
    return { ...m, precioSugerido: p?.precioSugeridoClp ?? null }
  })

  return (
    <div>
      {/* Narrativa */}
      <Card style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a' }}>
        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#92400e' }}>
          💰 ¿Cómo se calcula el precio sugerido?
        </p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: '#78350f' }}>
          <b>Precio sugerido = Precio base × Score de valor comercial.</b> El score combina
          tráfico relativo (40%), tasa de detención (30%), densidad (20%) y consistencia
          temporal (10%). Una zona con score 2.0x tiene el doble del valor comercial del
          promedio del recinto.
        </p>
      </Card>

      {/* Input */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">Precio base mensual (CLP)</label>
            <Input
              type="number"
              placeholder="Ej: 500000"
              value={precioBase}
              onChange={e => setPrecioBase(e.target.value)}
              onPressEnter={calcular}
              style={{ width: 200 }}
            />
          </div>
          <Button
            type="primary"
            onClick={calcular}
            loading={calculando}
            disabled={!precioBase}
            style={{ background: PRIMARY, borderColor: PRIMARY }}
          >
            Calcular precios
          </Button>
          {precios.length > 0 && (
            <span style={{ fontSize: 13, color: '#16a34a', alignSelf: 'center' }}>
              ✓ Precios calculados para {precios.length} zona{precios.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {errorMsg && (
          <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0 0' }}>{errorMsg}</p>
        )}
      </Card>

      {/* Cards por zona */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {tablaData.map(m => {
          const score = m.scoreCompuesto ?? 0
          const { tipo, color, bg } = getTipoZona(score)
          const ps   = m.precioSugerido
          const diff = ps != null && precioBase ? ps - Number(precioBase) : null
          const diffPct = diff != null && precioBase
            ? ((diff / Number(precioBase)) * 100).toFixed(1) : null

          return (
            <Col xs={24} sm={12} lg={8} key={m.idZona}>
              <div style={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${m.colorHexZona || PRIMARY}`,
                background: bg, padding: 20, height: '100%',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* Cabecera */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.nombreZona}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                    color, background: `${color}22`, padding: '2px 8px', borderRadius: 12,
                  }}>
                    {tipo.toUpperCase()}
                  </span>
                </div>

                {/* Score gauge */}
                <div style={{ textAlign: 'center' }}>
                  <ScoreGauge score={score} color={color} />
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    score de valor comercial
                  </div>
                </div>

                {/* Precio */}
                {ps != null ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>
                      {precioBase ? clp(precioBase) : '—'}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>
                      {clp(ps)}
                    </div>
                    {diff != null && (
                      <div style={{
                        fontSize: 12, marginTop: 2,
                        color: diff >= 0 ? '#16a34a' : '#dc2626',
                      }}>
                        {diff >= 0 ? '+' : ''}{clp(diff)} ({diff >= 0 ? '+' : ''}{diffPct}%)
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>
                    Ingresa un precio base para ver el precio sugerido
                  </div>
                )}

                {/* Justificación */}
                <div style={{
                  fontSize: 12, color: '#6b7280',
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.65)',
                  borderRadius: 6,
                }}>
                  {justificacion(m, avgDet)}
                </div>
              </div>
            </Col>
          )
        })}
      </Row>

      {/* Nota informativa */}
      <Card style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
          <b>Cómo interpretar:</b> El sistema multiplica tu precio base por el score de cada zona.
          Zona Premium (≥1.5x) → al menos 50% más. Zona Bajo (&lt;0.8x) → puede necesitar
          descuento o incentivos.{' '}
          <i>Los valores son orientativos; la negociación queda a criterio del administrador.</i>
        </p>
      </Card>
    </div>
  )
}
```

# Producto/frontend/src/pages/ResultadosPage.jsx

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Spin, Alert, Tabs, Card } from 'antd'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'
import TrayectoriasCanvas from '../components/TrayectoriasCanvas'
import FlujoSankeyChart from '../components/FlujoSankeyChart'
import MetricasTrackingPanel from '../components/MetricasTrackingPanel'
import { getTracks, getFlujoZonas, getMetricasTracking, getTrayectorias } from '../api/tracking'
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
  const [trayectorias, setTrayectorias] = useState([])
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
    getTrayectorias(id).then(r => setTrayectorias(r.data || [])).catch(() => {})
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
                      Cada línea es el recorrido real de una persona (verde = inicio, rojo = fin). Las burbujas indican personas únicas por zona; las flechas, cuando aparecen, muestran el flujo entre zonas.
                    </p>
                    <TrayectoriasCanvas
                      frameSrc={frameSrc}
                      zones={zones}
                      metricas={metricas}
                      flujoZonas={flujoZonas}
                      tracks={tracks}
                      trayectorias={trayectorias}
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
```

# Producto/frontend/src/components/ResumenEjecutivo.jsx

```jsx
import { Card, Row, Col, Statistic } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const PRIMARY = '#7C3AED'

export default function ResumenEjecutivo({ metricas }) {
  if (!metricas?.length) return null

  const totalDetecciones = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const hayTracking = metricas.some(m => (m.personasUnicas || 0) > 0)

  // Personas únicas: suma por zona del tracking (sobre-estima si personas cruzaron varias zonas)
  const totalPersonas = hayTracking
    ? metricas.reduce((s, m) => s + (m.personasUnicas || 0), 0)
    : 0

  // Permanencia promedio ponderada por zona
  const zonasConPermanencia = metricas.filter(m => m.tiempoPermanenciaProm != null)
  const permanenciaProm = hayTracking && zonasConPermanencia.length
    ? (zonasConPermanencia.reduce((s, m) => s + m.tiempoPermanenciaProm, 0) / zonasConPermanencia.length)
    : null

  // Zona top por personas únicas o por detecciones si no hay tracking
  const zonaTop = hayTracking
    ? [...metricas].sort((a, b) => (b.personasUnicas || 0) - (a.personasUnicas || 0))[0]
    : metricas.reduce((mx, m) => (m.totalDetecciones || 0) > (mx.totalDetecciones || 0) ? m : mx, metricas[0])

  // ── Datos para ranking por personas únicas ─────────────────────────────────
  const dataPersonas = [...metricas]
    .map(m => ({
      nombre: m.nombreZona,
      color: m.colorHexZona || PRIMARY,
      personas: m.personasUnicas || 0,
      detecciones: m.totalDetecciones || 0,
    }))
    .sort((a, b) => (hayTracking ? b.personas - a.personas : b.detecciones - a.detecciones))

  // ── Datos para ranking por permanencia ────────────────────────────────────
  const dataPermanencia = [...metricas]
    .map(m => ({
      nombre: m.nombreZona,
      color: m.colorHexZona || PRIMARY,
      permanencia: +(m.tiempoPermanenciaProm || 0).toFixed(1),
    }))
    .sort((a, b) => b.permanencia - a.permanencia)

  // ── Insight automático ─────────────────────────────────────────────────────
  const top2 = dataPersonas.slice(0, 2)
  const traficoTop2 = top2.reduce((s, d) => s + (hayTracking ? d.personas : d.detecciones), 0)
  const traficoTotal = hayTracking
    ? dataPersonas.reduce((s, d) => s + d.personas, 0)
    : totalDetecciones
  const pctTop2 = traficoTotal > 0 && top2.length === 2
    ? Math.round((traficoTop2 / traficoTotal) * 100)
    : null

  // ── Narrativa ─────────────────────────────────────────────────────────────
  const narrativa = hayTracking
    ? `Tu recinto registró ${totalPersonas} persona${totalPersonas !== 1 ? 's' : ''} única${totalPersonas !== 1 ? 's' : ''} distribuidas en ${metricas.length} zona${metricas.length !== 1 ? 's' : ''}. La zona de mayor tráfico fue "${zonaTop?.nombreZona}"${permanenciaProm != null ? ` con una permanencia promedio de ${permanenciaProm.toFixed(1)} segundos por visita` : ''}.`
    : `Tu recinto registró ${totalDetecciones} persona-segundos de exposición en ${metricas.length} zona${metricas.length !== 1 ? 's' : ''}. La zona más activa fue "${zonaTop?.nombreZona}".`

  const barHeight = Math.max(100, metricas.length * 44)

  return (
    <div>
      {/* Narrativa */}
      <Card style={{ marginBottom: 16, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: '#374151' }}>{narrativa}</p>
      </Card>

      {/* KPIs — 4 cards, las 2 primeras con borde azul (protagonistas) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #3b82f6' }}>
            <Statistic
              title={hayTracking ? 'Personas únicas' : 'Persona-segundos'}
              value={hayTracking ? totalPersonas : totalDetecciones}
              valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              {hayTracking ? 'identificadas por tracking' : 'OTS total del recinto'}
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #3b82f6' }}>
            <Statistic
              title="Permanencia promedio"
              value={permanenciaProm != null ? permanenciaProm.toFixed(1) : '—'}
              suffix={permanenciaProm != null ? ' s' : ''}
              valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              {permanenciaProm != null ? 'por persona por zona' : 'sin datos de tracking'}
            </p>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
            <Statistic
              title="Zonas analizadas"
              value={metricas.length}
              valueStyle={{ color: PRIMARY, fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>áreas del recinto</p>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 8, borderTop: '3px solid #16a34a' }}>
            <Statistic
              title="Zona top"
              value={zonaTop?.nombreZona || '—'}
              valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>mayor tráfico</p>
          </Card>
        </Col>
      </Row>

      {/* Gráficos lado a lado */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title={hayTracking ? 'Ranking por personas únicas' : 'Ranking por detecciones'}>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart
                layout="vertical"
                data={dataPersonas}
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={84} />
                <Tooltip
                  formatter={(v) => [
                    v,
                    hayTracking ? 'Personas únicas' : 'Detecciones',
                  ]}
                />
                <Bar
                  dataKey={hayTracking ? 'personas' : 'detecciones'}
                  radius={[0, 4, 4, 0]}
                >
                  {dataPersonas.map(d => <Cell key={d.nombre} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!hayTracking && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>
                * Tracking no disponible — mostrando detecciones (OTS).
              </p>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Ranking por permanencia (s)">
            {dataPermanencia.some(d => d.permanencia > 0) ? (
              <ResponsiveContainer width="100%" height={barHeight}>
                <BarChart
                  layout="vertical"
                  data={dataPermanencia}
                  margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12 }} width={84} />
                  <Tooltip formatter={(v) => [`${v}s`, 'Permanencia promedio']} />
                  <Bar dataKey="permanencia" radius={[0, 4, 4, 0]}>
                    {dataPermanencia.map(d => <Cell key={d.nombre} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: barHeight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, textAlign: 'center' }}>
                  Datos de permanencia no disponibles.<br />
                  <span style={{ fontSize: 11 }}>Se requiere análisis con ByteTrack activado.</span>
                </p>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Insight automático */}
      {pctTop2 != null && metricas.length >= 2 && (
        <Card style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: '#374151' }}>
            💡 Las zonas <b>{top2[0]?.nombre}</b> y <b>{top2[1]?.nombre}</b> concentran el{' '}
            <b>{pctTop2}%</b> del tráfico total.
            {pctTop2 > 70
              ? ' Concentración alta — oportunidad de pricing diferenciado significativo entre zonas.'
              : pctTop2 > 50
              ? ' Distribución moderadamente concentrada — buena base para precios diferenciados.'
              : ' Distribución equilibrada — el recinto tiene tráfico relativamente homogéneo.'}
          </p>
        </Card>
      )}
    </div>
  )
}
```
