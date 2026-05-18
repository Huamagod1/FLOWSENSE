import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table, Input, Button, Spin, Card, Statistic, Row, Col, Alert, Tooltip as AntTooltip, Progress, Tabs } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'
import TrayectoriasCanvas from '../components/TrayectoriasCanvas'
import FlujoSankeyChart from '../components/FlujoSankeyChart'
import MetricasTrackingPanel from '../components/MetricasTrackingPanel'
import { getTracks, getFlujoZonas, getMetricasTracking } from '../api/tracking'

const PRIMARY = '#7C3AED'
const clp = n => `$${Number(n).toLocaleString('es-CL')}`

function getCeldaColor(n) {
  if (!n || n === 0) return '#F3F4F6'
  if (n <= 2) return '#bbf7d0'
  if (n <= 5) return '#fef08a'
  return '#fca5a5'
}

function getScoreLabel(score) {
  if (score >= 1.5) return { label: 'PREMIUM', color: '#16a34a', bg: '#f0fdf4' }
  if (score >= 1.0) return { label: 'ESTÁNDAR ALTO', color: PRIMARY, bg: '#f5f3ff' }
  if (score >= 0.7) return { label: 'ESTÁNDAR', color: '#d97706', bg: '#fffbeb' }
  return { label: 'ECONÓMICO', color: '#ea580c', bg: '#fff7ed' }
}

function getTasaInfo(tasa) {
  const pct = tasa != null ? tasa * 100 : null
  if (pct == null) return { pct: null, label: '—', sublabel: '', color: '#9ca3af' }
  if (pct < 20) return { pct, label: 'ZONA DE PASO', sublabel: 'Las personas cruzan rápidamente', color: '#dc2626' }
  if (pct < 50) return { pct, label: 'INTERÉS MODERADO', sublabel: 'Tránsito con pausas ocasionales', color: '#d97706' }
  return { pct, label: 'ZONA DE INTERÉS', sublabel: 'Las personas se detienen, alta exposición a comercios', color: '#16a34a' }
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"
      style={{ color: '#9ca3af', cursor: 'help', verticalAlign: 'middle', marginLeft: 3 }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  )
}

function ColHeader({ label, tooltip }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {label}
      <AntTooltip title={tooltip} placement="top"><InfoIcon /></AntTooltip>
    </span>
  )
}

function ScoreGauge({ score, color }) {
  const r = 28
  const circ = 2 * Math.PI * r
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

function TooltipRanking({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const m = payload[0]?.payload
  const ratio = m._avg > 0 ? (m.totalDetecciones / m._avg).toFixed(1) : '—'
  const pct = m.porcentajeDelTotal
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e4e7', padding: '10px 14px', borderRadius: 8, fontSize: 13, maxWidth: 280 }}>
      <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        Esta zona genera <b>{m.totalDetecciones}</b> persona-segundos, equivalente al{' '}
        <b>{pct != null ? pct.toFixed(1) + '%' : '—'}</b> del tráfico total y{' '}
        <b>{ratio}x</b> el valor promedio del recinto.
      </p>
    </div>
  )
}

export default function ResultadosPage() {
  const { id } = useParams()

  const [estado, setEstado] = useState('PROCESANDO')
  const [mensajeError, setMensajeError] = useState('')
  const [detecciones, setDetecciones] = useState([])
  const [metricas, setMetricas] = useState([])
  const [metricasTemporales, setMetricasTemporales] = useState([])
  const [precioBase, setPrecioBase] = useState('')
  const [precios, setPrecios] = useState([])
  const [calculandoPrecios, setCalculandoPrecios] = useState(false)
  const [frameSrc, setFrameSrc] = useState(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [zones, setZones] = useState([])
  const [tracks, setTracks] = useState([])
  const [flujoZonas, setFlujoZonas] = useState([])
  const [metricasTracking, setMetricasTracking] = useState([])
  const [activeTab, setActiveTab] = useState('analisis')

  const canvasRef = useRef()
  const imgRef = useRef()
  const reporteRef = useRef()
  const trackingReporteRef = useRef()

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
  }, [estado, id])

  useEffect(() => {
    if (estado !== 'COMPLETADO') return
    let url = null
    api.get(`/videos/${id}/frame-preview/imagen`, { responseType: 'blob' })
      .then(r => { url = URL.createObjectURL(r.data); setFrameSrc(url) })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [estado, id])

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !detecciones.length) return
    const canvas = canvasRef.current
    const img = imgRef.current
    canvas.width = img.offsetWidth
    canvas.height = img.offsetHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    detecciones.forEach(d => {
      const x = d.x * canvas.width
      const y = d.y * canvas.height
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30)
      gradient.addColorStop(0, 'rgba(255,0,0,0.6)')
      gradient.addColorStop(0.5, 'rgba(255,165,0,0.3)')
      gradient.addColorStop(1, 'rgba(0,0,255,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [imgLoaded, detecciones])

  async function calcularPrecios() {
    if (!precioBase) return
    setCalculandoPrecios(true)
    try {
      const res = await api.post(`/videos/${id}/precio-sugerido`, { precioBase: Number(precioBase) })
      setPrecios(res.data || [])
    } catch { setMensajeError('Error al calcular precios') }
    finally { setCalculandoPrecios(false) }
  }

  async function exportarPDF() {
    const el = document.getElementById('reporte')
    if (!el) return
    try {
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW - 20
      const imgH = (canvas.height * imgW) / canvas.width
      pdf.setFontSize(18); pdf.setTextColor(124, 58, 237)
      pdf.text('Reporte FlowSense', 10, 14)
      pdf.setFontSize(10); pdf.setTextColor(100, 100, 100)
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 10, 21)
      pdf.text(`Video ID: ${id}`, 10, 27)
      pdf.addImage(imgData, 'PNG', 10, 33, imgW, Math.min(imgH, pageH - 43))

      const tEl = trackingReporteRef.current
      const hayDatosTracking = flujoZonas.length > 0 || tracks.length > 0
      if (tEl && hayDatosTracking) {
        const prevStyle = tEl.getAttribute('style') || ''
        tEl.setAttribute('style',
          'display:block !important; position:fixed; left:-9999px; top:0; z-index:-1; background:white; width:900px; padding:20px;')
        await new Promise(resolve => setTimeout(resolve, 120))
        const tCanvas = await html2canvas(tEl, { scale: 1.5, useCORS: true })
        tEl.setAttribute('style', prevStyle)
        const tImgH = (tCanvas.height * imgW) / tCanvas.width
        pdf.addPage()
        pdf.setFontSize(14); pdf.setTextColor(124, 58, 237)
        pdf.text('Análisis de Trayectorias (ByteTrack)', 10, 14)
        pdf.setFontSize(10); pdf.setTextColor(100, 100, 100)
        pdf.text(`Video ID: ${id}`, 10, 21)
        pdf.addImage(tCanvas.toDataURL('image/png'), 'PNG', 10, 28, imgW, Math.min(tImgH, pageH - 38))
      }

      pdf.save(`reporte-flowsense-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch { setMensajeError('Error al generar el PDF') }
  }

  // ── Datos derivados ──────────────────────────────────────────────────────────

  const totalDetecciones = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const avgDetecciones = metricas.length ? totalDetecciones / metricas.length : 0
  const maxScore = metricas.length ? Math.max(...metricas.map(m => m.scoreCompuesto || 0)) : null
  const minScore = metricas.length ? Math.min(...metricas.map(m => m.scoreCompuesto || 0)) : null
  const scorePromedio = metricas.length
    ? (metricas.reduce((s, m) => s + (m.scoreCompuesto || 0), 0) / metricas.length).toFixed(2)
    : null

  const metricasOrdenadas = [...metricas].sort((a, b) => {
    const d = (b.totalDetecciones || 0) - (a.totalDetecciones || 0)
    return d !== 0 ? d : (b.scoreCompuesto || 0) - (a.scoreCompuesto || 0)
  })
  const zonaMasActiva = metricasOrdenadas[0] ?? null
  const zonaMenosActiva = metricasOrdenadas[metricasOrdenadas.length - 1] ?? null
  const hayEmpate = zonaMasActiva && zonaMenosActiva && zonaMasActiva.idZona === zonaMenosActiva.idZona
  const tasaPromedio = metricas.length
    ? metricas.reduce((s, m) => s + (m.tasaDetencion || 0), 0) / metricas.length
    : null

  const metricasRanking = metricasOrdenadas.map(m => ({ ...m, _avg: avgDetecciones }))

  // Heatmap temporal
  const franjas = [...new Set(metricasTemporales.map(mt => mt.franjaNumero))].sort((a, b) => a - b)
  const franjaLabels = {}
  metricasTemporales.forEach(mt => { franjaLabels[mt.franjaNumero] = `Seg. ${mt.segundoInicio}-${mt.segundoFin}` })
  const matrizTemporal = {}
  metricasTemporales.forEach(mt => {
    if (!matrizTemporal[mt.idZona]) matrizTemporal[mt.idZona] = {}
    matrizTemporal[mt.idZona][mt.franjaNumero] = mt.totalDetecciones
  })

  const franjasTotals = franjas.map(f =>
    metricasTemporales.filter(mt => mt.franjaNumero === f).reduce((s, mt) => s + (mt.totalDetecciones || 0), 0)
  )
  const avgFranja = franjasTotals.length ? franjasTotals.reduce((a, b) => a + b, 0) / franjasTotals.length : 0
  const maxFranja = franjasTotals.length ? Math.max(...franjasTotals) : 0
  const esIrregular = avgFranja > 0 && maxFranja / avgFranja > 2.5

  const tablaData = metricas.map(m => {
    const p = precios.find(p => p.idZona === m.idZona || p.nombreZona === m.nombreZona)
    return { ...m, precio_sugerido: p?.precioSugeridoClp ?? null }
  })

  // Conclusiones
  function generarConclusiones() {
    if (!metricas.length || !zonaMasActiva || !zonaMenosActiva || hayEmpate) return null
    const pctMayor = totalDetecciones > 0
      ? ((zonaMasActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1) : null
    const pctMenor = totalDetecciones > 0
      ? ((zonaMenosActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1) : null
    const scoreMayor = zonaMasActiva.scoreCompuesto?.toFixed(2) ?? null
    const scoreMenor = zonaMenosActiva.scoreCompuesto?.toFixed(2) ?? null
    const precioDif = (scoreMayor && scoreMenor && Number(scoreMenor) > 0)
      ? (Number(scoreMayor) / Number(scoreMenor)).toFixed(1) : null
    const tasaPct = tasaPromedio != null ? (tasaPromedio * 100).toFixed(1) : null
    let tasaComentario = ''
    if (tasaPct != null) {
      if (Number(tasaPct) >= 40) tasaComentario = 'Las personas tienden a detenerse, indicando interés en vitrinas o productos.'
      else if (Number(tasaPct) >= 20) tasaComentario = 'Flujo mixto: parte de paso, parte con detención breve.'
      else tasaComentario = 'Las personas están mayormente de paso. Considera elementos que retengan la atención.'
    }
    return { pctMayor, pctMenor, scoreMayor, scoreMenor, precioDif, tasaPct, tasaComentario }
  }
  const conclusiones = generarConclusiones()

  // Resumen ejecutivo
  function generarOportunidades() {
    const items = []
    if (zonaMasActiva && totalDetecciones > 0) {
      const pct = ((zonaMasActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1)
      items.push(`La zona ${zonaMasActiva.nombreZona} genera el ${pct}% del valor → revisar contrato vigente`)
    }
    if (!hayEmpate && zonaMasActiva && zonaMenosActiva &&
        zonaMenosActiva.scoreCompuesto > 0 && zonaMasActiva.scoreCompuesto > 0) {
      const ratio = (zonaMasActiva.scoreCompuesto / zonaMenosActiva.scoreCompuesto).toFixed(1)
      items.push(`Diferencia de precio justificada entre ${zonaMasActiva.nombreZona} y ${zonaMenosActiva.nombreZona}: ${ratio}x`)
    }
    metricas.forEach(m => {
      if (m.tasaDetencion != null && m.tasaDetencion * 100 > 50)
        items.push(`La zona ${m.nombreZona} muestra alta atención (${(m.tasaDetencion * 100).toFixed(0)}%), ideal para retail premium`)
    })
    return items
  }

  function generarAlertas() {
    const items = []
    metricas.forEach(m => {
      if (totalDetecciones > 0 && (m.totalDetecciones / totalDetecciones) * 100 < 10)
        items.push(`Zona ${m.nombreZona} subutilizada (<10% del tráfico), considerar reorganización o promoción`)
    })
    if (scorePromedio != null && Number(scorePromedio) < 0.8)
      items.push('Recinto con tráfico bajo, evaluar estrategias globales de afluencia')
    if (esIrregular)
      items.push('Tráfico inconsistente entre franjas, considerar horarios diferenciados')
    return items
  }

  const oportunidades = generarOportunidades()
  const alertas = generarAlertas()

  // Columnas tabla resumen (simplificada)
  const columnas = [
    {
      title: <ColHeader label="Zona" tooltip="Área del recinto definida por el administrador" />,
      dataIndex: 'nombreZona', key: 'nombreZona',
      render: (nombre, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: row.colorHexZona || PRIMARY, flexShrink: 0 }} />
          {nombre}
        </span>
      ),
    },
    {
      title: <ColHeader label="Detecciones" tooltip="Persona-segundos registrados. Cada detección = 1 segundo de presencia humana." />,
      dataIndex: 'totalDetecciones', key: 'totalDetecciones',
    },
    {
      title: <ColHeader label="% Total" tooltip="Porcentaje de exposición de esta zona sobre el total del recinto" />,
      key: 'pct',
      render: (_, row) => totalDetecciones > 0
        ? `${((row.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%` : '—',
    },
    {
      title: <ColHeader label="Precio base" tooltip="Precio de referencia ingresado por el administrador" />,
      key: 'precio_base',
      render: () => precioBase ? clp(precioBase) : '—',
    },
    {
      title: <ColHeader label="Precio sugerido" tooltip="Precio recomendado = Precio Base × Score." />,
      key: 'precio_sugerido',
      render: (_, row) => row.precio_sugerido != null
        ? <b style={{ color: PRIMARY }}>{clp(row.precio_sugerido)}</b> : '—',
    },
  ]

  // Bar label para ranking horizontal
  function renderBarLabel({ x, y, width, height, value, index }) {
    const m = metricasRanking[index]
    if (!m) return null
    const ratio = avgDetecciones > 0 ? (m.totalDetecciones / avgDetecciones).toFixed(1) : '—'
    return (
      <text x={x + width + 6} y={y + height / 2} fill="#374151" fontSize={11} dominantBaseline="middle">
        {value} ({ratio}x)
      </text>
    )
  }

  // ── Estados de carga ─────────────────────────────────────────────────────────

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

  // ── Render principal ─────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>Resultados del análisis</h2>
          <p className="text-muted" style={{ margin: 0 }}>Video ID: {id}</p>
        </div>
        <Button onClick={exportarPDF} type="primary" style={{ background: PRIMARY, borderColor: PRIMARY }}>
          Exportar PDF
        </Button>
      </div>

      {mensajeError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{mensajeError}</div>}

      {bannerVisible && (
        <Alert type="info" closable onClose={() => setBannerVisible(false)} style={{ marginBottom: 16 }}
          message="📊 Este reporte mide exposición comercial por zona usando la métrica OTS (Opportunity To See). Cada detección equivale a 1 segundo de presencia humana. Una zona con más detecciones tiene mayor valor comercial." />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        destroyInactiveTabPane={false}
        items={[
          {
            key: 'analisis',
            label: 'Análisis',
            children: (
        <div id="reporte" ref={reporteRef}>

        {/* ── Cards de resumen ─────────────────────────────────────────── */}
        <div className="section">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
                <Statistic
                  title={<AntTooltip title="Suma de exposición de todas las zonas. Equivale a la presencia humana total registrada en el video."><span style={{ cursor: 'help' }}>Total detecciones <InfoIcon /></span></AntTooltip>}
                  value={totalDetecciones}
                  valueStyle={{ color: PRIMARY, fontWeight: 700 }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>personas-segundos</p>
              </Card>
            </Col>
            {hayEmpate ? (
              <Col xs={24} sm={12} lg={12}>
                <Card style={{ borderRadius: 8, borderTop: '3px solid #6b7280' }}>
                  <Statistic title="Zonas con tráfico equivalente"
                    value={`${metricasOrdenadas.length} zonas`}
                    suffix={zonaMasActiva ? ` · ${zonaMasActiva.totalDetecciones} det. c/u` : ''}
                    valueStyle={{ color: '#6b7280', fontWeight: 700, fontSize: 16 }} />
                </Card>
              </Col>
            ) : (
              <>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: 8, borderTop: '3px solid #16a34a' }}>
                    <Statistic
                      title={<AntTooltip title="Zona con mayor exposición comercial. Justifica precio de arriendo más alto."><span style={{ cursor: 'help' }}>Zona más activa <InfoIcon /></span></AntTooltip>}
                      value={zonaMasActiva?.nombreZona || '—'}
                      suffix={zonaMasActiva ? ` (${zonaMasActiva.totalDetecciones})` : ''}
                      valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>p-s · mayor exposición</p>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: 8, borderTop: '3px solid #dc2626' }}>
                    <Statistic
                      title={<AntTooltip title="Zona con menor exposición. Considerar estrategias para aumentar tráfico o ajustar precio."><span style={{ cursor: 'help' }}>Zona menos activa <InfoIcon /></span></AntTooltip>}
                      value={zonaMenosActiva?.nombreZona || '—'}
                      suffix={zonaMenosActiva ? ` (${zonaMenosActiva.totalDetecciones})` : ''}
                      valueStyle={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}
                    />
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>p-s · menor exposición</p>
                  </Card>
                </Col>
              </>
            )}
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 8, borderTop: '3px solid #d97706' }}>
                <Statistic
                  title={<AntTooltip title="Promedio de scores del recinto. 1.0 = valor estándar. >1.5 = recinto premium. <0.7 = recinto de bajo tráfico."><span style={{ cursor: 'help' }}>Score promedio recinto <InfoIcon /></span></AntTooltip>}
                  value={scorePromedio ?? '—'}
                  valueStyle={{ color: '#d97706', fontWeight: 700 }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>índice de valor relativo</p>
              </Card>
            </Col>
          </Row>
        </div>

        {/* ── Mapa de calor ────────────────────────────────────────────── */}
        <div className="section">
          <h3 className="section-title">Mapa de calor — Concentración de tráfico peatonal</h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
            Las zonas con tonos rojos/naranjas indican mayor exposición comercial. Áreas en blanco/gris tienen menor tráfico.
          </p>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 800, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e4e7' }}>
            {frameSrc
              ? <img ref={imgRef} src={frameSrc} alt="Frame del video" style={{ width: '100%', display: 'block' }} onLoad={() => setImgLoaded(true)} />
              : <div style={{ width: '100%', paddingBottom: '56.25%', background: '#1f2028' }} />
            }
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Menor tráfico</span>
            <div style={{ width: 200, height: 12, borderRadius: 4, background: 'linear-gradient(to right, rgba(0,0,255,0), rgba(255,165,0,0.3), rgba(255,0,0,0.6))' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>Mayor tráfico</span>
          </div>
        </div>

        {/* ── SECCIÓN 1: Ranking de tráfico comercial ───────────────────── */}
        {metricas.length > 0 && (
          <div className="section">
            <Card>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Ranking de tráfico comercial</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                ¿Qué zona vale más comercialmente? — Comparación directa de persona-segundos entre zonas.
              </p>
              <ResponsiveContainer width="100%" height={Math.max(120, metricasRanking.length * 52)}>
                <BarChart layout="vertical" data={metricasRanking}
                  margin={{ top: 4, right: 140, left: 8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }}
                    label={{ value: 'Persona-segundos', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#6b7280' }} />
                  <YAxis type="category" dataKey="nombreZona" tick={{ fontSize: 13 }} width={90} />
                  <Tooltip content={<TooltipRanking />} />
                  {avgDetecciones > 0 && (
                    <ReferenceLine x={avgDetecciones} stroke="#9ca3af" strokeDasharray="4 4"
                      label={{ value: 'Promedio', position: 'insideTopRight', fontSize: 11, fill: '#9ca3af' }} />
                  )}
                  <Bar dataKey="totalDetecciones" name="Detecciones" radius={[0, 4, 4, 0]} label={renderBarLabel}>
                    {metricasRanking.map(m => <Cell key={m.idZona} fill={m.colorHexZona || PRIMARY} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {!hayEmpate && zonaMasActiva && zonaMenosActiva && totalDetecciones > 0 && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 6, fontSize: 13, lineHeight: 1.8 }}>
                  <div>💼 La zona <b>{zonaMasActiva.nombreZona}</b> concentra <b>{((zonaMasActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%</b> del tráfico → cobrar premium</div>
                  <div>📍 La zona <b>{zonaMenosActiva.nombreZona}</b> concentra <b>{((zonaMenosActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%</b> del tráfico → considerar incentivos</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── SECCIÓN 2: Comportamiento del visitante ────────────────────── */}
        {metricas.length > 0 && (
          <div className="section">
            <Card>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>🚶 Comportamiento del visitante por zona</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
                Identifica si las zonas funcionan como corredores de tránsito o como espacios de exploración comercial.
                Esto impacta directamente el tipo de negocio recomendado para cada zona.
              </p>
              <Row gutter={[16, 16]}>
                {metricas.map(m => {
                  const { pct, label, sublabel, color } = getTasaInfo(m.tasaDetencion)
                  return (
                    <Col xs={24} sm={12} lg={8} key={m.idZona}>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, borderLeft: `4px solid ${m.colorHexZona || PRIMARY}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: m.colorHexZona || PRIMARY, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{m.nombreZona}</span>
                        </div>
                        <div style={{ fontSize: 42, fontWeight: 700, color, lineHeight: 1, marginBottom: 8 }}>
                          {pct != null ? `${pct.toFixed(0)}%` : '—'}
                        </div>
                        <Progress percent={pct != null ? Math.round(Math.min(pct, 100)) : 0}
                          strokeColor={color} showInfo={false} style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{sublabel}</div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            </Card>
          </div>
        )}

        {/* ── SECCIÓN 3: Distribución temporal (heatmap CSS) ─────────────── */}
        <div className="section">
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>⏰ Distribución temporal del tráfico</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Identifica franjas horarias críticas. Útil para definir pricing diferenciado por horario
              o programar campañas en zonas con alta variabilidad.
            </p>

            {franjas.length > 0 && metricas.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `140px repeat(${franjas.length}, minmax(52px, 1fr))`,
                    gap: 3, minWidth: 360
                  }}>
                    <div />
                    {franjas.map(f => (
                      <div key={`h-${f}`} style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', padding: '4px 2px', fontWeight: 500 }}>
                        {franjaLabels[f] || `F${f}`}
                      </div>
                    ))}
                    {metricas.flatMap(zona => [
                      <div key={`lbl-${zona.idZona}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 0' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: zona.colorHexZona || PRIMARY, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zona.nombreZona}</span>
                      </div>,
                      ...franjas.map(f => {
                        const n = matrizTemporal[zona.idZona]?.[f] ?? 0
                        return (
                          <AntTooltip key={`cel-${zona.idZona}-${f}`}
                            title={`${zona.nombreZona} · ${franjaLabels[f] || `Franja ${f}`}: ${n} detecciones`}>
                            <div style={{
                              background: getCeldaColor(n), borderRadius: 4, textAlign: 'center',
                              fontSize: 12, fontWeight: n > 0 ? 600 : 400,
                              color: n > 5 ? '#7f1d1d' : '#374151', padding: '8px 4px', cursor: 'default'
                            }}>
                              {n}
                            </div>
                          </AntTooltip>
                        )
                      })
                    ])}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
                  {[
                    { bg: '#F3F4F6', label: '0 det.' },
                    { bg: '#bbf7d0', label: '1–2 det.' },
                    { bg: '#fef08a', label: '3–5 det.' },
                    { bg: '#fca5a5', label: '6+ det.' },
                  ].map(({ bg, label }) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 14, height: 14, background: bg, borderRadius: 2, display: 'inline-block', border: '1px solid #e5e7eb' }} />
                      {label}
                    </span>
                  ))}
                </div>

                {franjas.length < 5 && (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#d97706' }}>
                    ⚠️ Para análisis horario detallado se recomiendan videos de al menos 30 minutos representativos del día.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
                ⚠️ Patrón temporal no disponible. Para análisis temporal significativo se requieren videos de al menos
                30 segundos. El video actual es muy corto para identificar tendencias.
              </p>
            )}
          </Card>
        </div>

        {/* ── SECCIÓN 4: Recomendación de pricing ───────────────────────── */}
        <div className="section">
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>💰 Recomendación de pricing por zona</h3>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
              Precios calculados con base en el valor comercial relativo. La diferencia se justifica con datos objetivos de tráfico peatonal.
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              💡 Ingresa el precio base de arriendo mensual del recinto. El sistema calculará el precio sugerido
              por zona multiplicándolo por su Score de valor comercial.
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="field" style={{ margin: 0 }}>
                <label className="field-label">Precio base (CLP)</label>
                <Input type="number" placeholder="Ej: 100000" value={precioBase}
                  onChange={e => setPrecioBase(e.target.value)} style={{ width: 160 }} />
              </div>
              <Button type="primary" onClick={calcularPrecios} loading={calculandoPrecios}
                disabled={!precioBase} style={{ background: PRIMARY, borderColor: PRIMARY }}>
                Calcular precios
              </Button>
              {precios.length > 0 && (
                <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
                  ✓ Precios calculados para {precios.length} zona{precios.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {metricas.length > 0 && (
              <Row gutter={[16, 16]}>
                {tablaData.map(m => {
                  const score = m.scoreCompuesto ?? 0
                  const { label: scoreLabel, color: scoreColor, bg: scoreBg } = getScoreLabel(score)
                  const pSugerido = m.precio_sugerido
                  const diff = pSugerido != null && precioBase ? pSugerido - Number(precioBase) : null
                  const diffPct = diff != null && precioBase
                    ? ((diff / Number(precioBase)) * 100).toFixed(1) : null
                  const traficoRatio = avgDetecciones > 0 ? (m.totalDetecciones / avgDetecciones).toFixed(1) : '—'
                  const tasaLabel = m.tasaDetencion != null
                    ? (m.tasaDetencion * 100 >= 50 ? 'alta' : m.tasaDetencion * 100 >= 20 ? 'media' : 'baja')
                    : 'desconocida'

                  return (
                    <Col xs={24} sm={12} lg={8} key={m.idZona}>
                      <div style={{
                        borderRadius: 8, border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${m.colorHexZona || PRIMARY}`,
                        background: scoreBg, padding: 20, height: '100%',
                        display: 'flex', flexDirection: 'column', gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, fontSize: 15 }}>{m.nombreZona}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                            color: scoreColor, background: `${scoreColor}22`,
                            padding: '2px 8px', borderRadius: 12
                          }}>
                            {scoreLabel}
                          </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <ScoreGauge score={score} color={scoreColor} />
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>score de valor comercial</div>
                        </div>

                        {pSugerido != null ? (
                          <>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>
                                {precioBase ? clp(precioBase) : '—'}
                              </div>
                              <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor, lineHeight: 1.2 }}>
                                {clp(pSugerido)}
                              </div>
                              {diff != null && (
                                <div style={{ fontSize: 12, color: diff >= 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
                                  {diff >= 0 ? '+' : ''}{clp(diff)} ({diff >= 0 ? '+' : ''}{diffPct}%)
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 6 }}>
                              Esta zona tiene {traficoRatio}x el tráfico promedio + tasa de detención {tasaLabel} = valor {scoreLabel.toLowerCase()}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>
                            Ingresa un precio base para ver el precio sugerido
                          </div>
                        )}
                      </div>
                    </Col>
                  )
                })}
              </Row>
            )}
          </Card>
        </div>

        {/* ── Tabla resumen simplificada ────────────────────────────────── */}
        {metricas.length > 0 && (
          <div className="section">
            <Card>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Vista tabular resumen</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                Resumen numérico comparativo de todas las zonas.
              </p>
              <Table dataSource={tablaData} columns={columnas} rowKey="idZona"
                pagination={false} size="small"
                rowClassName={row => {
                  if (row.scoreCompuesto === maxScore) return 'row-highlight-green'
                  if (row.scoreCompuesto === minScore) return 'row-highlight-red'
                  return ''
                }}
              />
            </Card>
          </div>
        )}

        {/* ── SECCIÓN 5: Resumen ejecutivo ──────────────────────────────── */}
        {metricas.length > 0 && (
          <div className="section">
            <Card style={{ background: '#F5F3FF', borderLeft: `4px solid ${PRIMARY}` }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, color: PRIMARY }}>📋 Resumen ejecutivo para el administrador</h3>
              <Row gutter={[24, 16]}>
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#16a34a' }}>✅ Oportunidades</div>
                  {oportunidades.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.9, color: '#374151' }}>
                      {oportunidades.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Sin oportunidades destacadas identificadas.</p>
                  )}
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#dc2626' }}>⚠️ Alertas</div>
                  {alertas.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.9, color: '#374151' }}>
                      {alertas.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Sin alertas activas. El recinto muestra distribución equilibrada.</p>
                  )}
                </Col>
                <Col xs={24} md={8}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: PRIMARY }}>🚀 Próximos pasos</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.9, color: '#374151' }}>
                    <li>Compartir reporte PDF con arrendatarios</li>
                    <li>Negociar precios sugeridos con datos en mano</li>
                    <li>Repetir análisis en distinto horario para validar patrón</li>
                    <li>Grabar video de día de mayor afluencia para validación</li>
                  </ul>
                </Col>
              </Row>
            </Card>
          </div>
        )}

        {/* ── Conclusiones del análisis ─────────────────────────────────── */}
        {conclusiones && (
          <div className="section">
            <Card title="🎯 Conclusiones del análisis" style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
              <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                La zona <b>{zonaMasActiva?.nombreZona}</b> concentra el <b>{conclusiones.pctMayor}%</b> del tráfico
                total con un score de <b>{conclusiones.scoreMayor}</b>.
                {conclusiones.precioDif && <> Se sugiere un precio <b>{conclusiones.precioDif}x</b> mayor que la zona de menor tráfico.</>}
              </p>
              <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
                La zona <b>{zonaMenosActiva?.nombreZona}</b> muestra el <b>{conclusiones.pctMenor}%</b> del tráfico
                con score <b>{conclusiones.scoreMenor}</b>. Considera estrategias de aumento de visibilidad o ajuste de precio a la baja.
              </p>
              {conclusiones.tasaPct != null && (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Tasa promedio de detención del recinto: <b>{conclusiones.tasaPct}%</b>. {conclusiones.tasaComentario}
                </p>
              )}
            </Card>
          </div>
        )}

      </div>
            ),
          },
          {
            key: 'tracking',
            label: 'Tracking',
            children: (
              <div ref={trackingReporteRef}>
                <div className="section">
                  <Card>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Trayectorias y zonas</h3>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
                      Las burbujas muestran el número de personas únicas por zona. Las flechas indican flujo entre zonas.
                    </p>
                    <TrayectoriasCanvas
                      frameSrc={frameSrc}
                      zones={zones}
                      metricas={metricas}
                      flujoZonas={flujoZonas}
                    />
                  </Card>
                </div>

                {flujoZonas.length > 0 && (
                  <div className="section">
                    <Card>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Flujo entre zonas</h3>
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
