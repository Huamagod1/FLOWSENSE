import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table, Input, Button, Spin, Card, Statistic, Row, Col } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'

const PRIMARY = '#7C3AED'

const clp = n => `$${Number(n).toLocaleString('es-CL')}`

function TooltipBarra({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const m = payload[0]?.payload
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e4e7', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
      <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
      <p style={{ margin: '2px 0' }}>Detecciones: <b>{m.totalDetecciones}</b></p>
      <p style={{ margin: '2px 0' }}>% del total: <b>{m.porcentajeDelTotal != null ? m.porcentajeDelTotal.toFixed(1) + '%' : '—'}</b></p>
      <p style={{ margin: '2px 0' }}>Score: <b>{m.scoreCompuesto != null ? m.scoreCompuesto.toFixed(2) : '—'}</b></p>
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

  const canvasRef = useRef()
  const imgRef = useRef()
  const reporteRef = useRef()

  const pollingActivo = estado !== 'COMPLETADO' && estado !== 'ERROR'

  async function consultarEstado() {
    try {
      const res = await api.get(`/videos/${id}/estado`)
      setEstado(res.data.estado)
      if (res.data.estado === 'ERROR') {
        setMensajeError(res.data.mensajeError || res.data.mensaje_error || 'Error en el análisis')
      }
    } catch {
      setMensajeError('No se pudo consultar el estado del análisis')
      setEstado('ERROR')
    }
  }

  usePolling(consultarEstado, 3000, pollingActivo)
  useEffect(() => { consultarEstado() }, [id])

  useEffect(() => {
    if (estado !== 'COMPLETADO') return
    api.get(`/videos/${id}/detecciones`).then(res => setDetecciones(res.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas`).then(res => setMetricas(res.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas-temporales`).then(res => setMetricasTemporales(res.data || [])).catch(() => {})
  }, [estado, id])

  useEffect(() => {
    if (estado !== 'COMPLETADO') return
    let objectUrl = null
    api.get(`/videos/${id}/frame-preview/imagen`, { responseType: 'blob' })
      .then(res => {
        objectUrl = URL.createObjectURL(res.data)
        setFrameSrc(objectUrl)
      })
      .catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
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
      const radius = 30
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)')
      gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.3)')
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [imgLoaded, detecciones])

  async function calcularPrecios() {
    if (!precioBase) return
    setCalculandoPrecios(true)
    try {
      const res = await api.post(`/videos/${id}/precio-sugerido`, { precioBase: Number(precioBase) })
      setPrecios(res.data || [])
    } catch {
      setMensajeError('Error al calcular precios')
    } finally {
      setCalculandoPrecios(false)
    }
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

      pdf.setFontSize(18)
      pdf.setTextColor(124, 58, 237)
      pdf.text('Reporte FlowSense', 10, 14)
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 10, 21)
      pdf.text(`Video ID: ${id}`, 10, 27)

      const imgY = 33
      pdf.addImage(imgData, 'PNG', 10, imgY, imgW, Math.min(imgH, pageH - imgY - 10))
      pdf.save(`reporte-flowsense-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      setMensajeError('Error al generar el PDF')
    }
  }

  // ── Datos derivados ──────────────────────────────────────────────────────────

  const totalDetecciones = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const maxScore = metricas.length ? Math.max(...metricas.map(m => m.scoreCompuesto || 0)) : null
  const minScore = metricas.length ? Math.min(...metricas.map(m => m.scoreCompuesto || 0)) : null
  const scorePromedio = metricas.length
    ? (metricas.reduce((s, m) => s + (m.scoreCompuesto || 0), 0) / metricas.length).toFixed(2)
    : null

  const metricasOrdenadas = [...metricas].sort((a, b) => {
    const diff = (b.totalDetecciones || 0) - (a.totalDetecciones || 0)
    return diff !== 0 ? diff : (b.scoreCompuesto || 0) - (a.scoreCompuesto || 0)
  })
  const zonaMasActiva = metricasOrdenadas[0] ?? null
  const zonaMenosActiva = metricasOrdenadas[metricasOrdenadas.length - 1] ?? null
  const hayEmpate = zonaMasActiva && zonaMenosActiva && zonaMasActiva.idZona === zonaMenosActiva.idZona

  const tablaData = metricas.map(m => {
    const precioZona = precios.find(p => p.idZona === m.idZona || p.nombreZona === m.nombreZona)
    return { ...m, precio_sugerido: precioZona?.precioSugeridoClp ?? null }
  })

  // Pivote de métricas temporales: [{franja, 'Zona A': n, 'Zona B': n}]
  const franjas = [...new Set(metricasTemporales.map(mt => mt.franjaNumero))].sort((a, b) => a - b)
  const datosTemporales = franjas.map(franja => {
    const items = metricasTemporales.filter(mt => mt.franjaNumero === franja)
    const ref = items[0]
    const label = ref ? `Seg. ${ref.segundoInicio}-${ref.segundoFin}` : `Franja ${franja}`
    const punto = { franja: label }
    items.forEach(mt => {
      const zona = metricas.find(m => m.idZona === mt.idZona)
      punto[zona?.nombreZona || `Zona ${mt.idZona}`] = mt.totalDetecciones
    })
    return punto
  })
  const nombresZonasTemporales = [...new Set(
    metricasTemporales.map(mt => metricas.find(m => m.idZona === mt.idZona)?.nombreZona || `Zona ${mt.idZona}`)
  )]

  const columnas = [
    {
      title: 'Zona', dataIndex: 'nombreZona', key: 'nombreZona',
      render: (nombre, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: row.colorHexZona || PRIMARY, flexShrink: 0 }} />
          {nombre}
        </span>
      ),
    },
    { title: 'Detecciones', dataIndex: 'totalDetecciones', key: 'totalDetecciones' },
    {
      title: '% Total', key: 'pct',
      render: (_, row) => totalDetecciones > 0
        ? `${((row.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%` : '—',
    },
    {
      title: 'Tasa detención', dataIndex: 'tasaDetencion', key: 'tasaDetencion',
      render: v => v != null ? `${(v * 100).toFixed(1)}%` : '—',
    },
    {
      title: 'Score', dataIndex: 'scoreCompuesto', key: 'scoreCompuesto',
      render: v => v != null ? v.toFixed(2) : '—',
      sorter: (a, b) => (a.scoreCompuesto || 0) - (b.scoreCompuesto || 0),
    },
    {
      title: 'Precio base', key: 'precio_base',
      render: () => precioBase ? clp(precioBase) : '—',
    },
    {
      title: 'Precio sugerido', key: 'precio_sugerido',
      render: (_, row) => row.precio_sugerido != null
        ? <b style={{ color: PRIMARY }}>{clp(row.precio_sugerido)}</b> : '—',
    },
  ]

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

      <div id="reporte" ref={reporteRef}>

        {/* SECCIÓN 1 — Mapa de calor */}
        <div className="section">
          <h3 className="section-title">Mapa de calor</h3>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 800, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e4e7' }}>
            {frameSrc
              ? <img ref={imgRef} src={frameSrc} alt="Frame del video" style={{ width: '100%', display: 'block' }} onLoad={() => setImgLoaded(true)} />
              : <div style={{ width: '100%', paddingBottom: '56.25%', background: '#1f2028' }} />
            }
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* SECCIÓN 2 — Cards de resumen */}
        <div className="section">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
                <Statistic
                  title="Total detecciones"
                  value={totalDetecciones}
                  valueStyle={{ color: PRIMARY, fontWeight: 700 }}
                />
              </Card>
            </Col>
            {hayEmpate ? (
              <Col xs={24} sm={12} lg={12}>
                <Card style={{ borderRadius: 8, borderTop: '3px solid #6b7280' }}>
                  <Statistic
                    title="Zonas con tráfico equivalente"
                    value={`${metricasOrdenadas.length} zonas`}
                    suffix={zonaMasActiva ? ` · ${zonaMasActiva.totalDetecciones} det. c/u` : ''}
                    valueStyle={{ color: '#6b7280', fontWeight: 700, fontSize: 16 }}
                  />
                </Card>
              </Col>
            ) : (
              <>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: 8, borderTop: '3px solid #16a34a' }}>
                    <Statistic
                      title="Zona más activa"
                      value={zonaMasActiva?.nombreZona || '—'}
                      suffix={zonaMasActiva ? ` (${zonaMasActiva.totalDetecciones})` : ''}
                      valueStyle={{ color: '#16a34a', fontWeight: 700, fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ borderRadius: 8, borderTop: '3px solid #dc2626' }}>
                    <Statistic
                      title="Zona menos activa"
                      value={zonaMenosActiva?.nombreZona || '—'}
                      suffix={zonaMenosActiva ? ` (${zonaMenosActiva.totalDetecciones})` : ''}
                      valueStyle={{ color: '#dc2626', fontWeight: 700, fontSize: 16 }}
                    />
                  </Card>
                </Col>
              </>
            )}
            <Col xs={24} sm={12} lg={6}>
              <Card style={{ borderRadius: 8, borderTop: '3px solid #d97706' }}>
                <Statistic
                  title="Score promedio recinto"
                  value={scorePromedio ?? '—'}
                  valueStyle={{ color: '#d97706', fontWeight: 700 }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* SECCIÓN 3 — Gráfico de barras comparativo */}
        {metricas.length > 0 && (
          <div className="section">
            <h3 className="section-title">Detecciones por zona</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricas} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="nombreZona" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<TooltipBarra />} />
                <Bar dataKey="totalDetecciones" name="Detecciones" radius={[4, 4, 0, 0]}>
                  {metricas.map(m => (
                    <Cell key={m.idZona} fill={m.colorHexZona || PRIMARY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SECCIÓN 4 — Tabla de métricas + Sección 6 Precio sugerido */}
        <div className="section">
          <h3 className="section-title">Métricas por zona</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="field-label">Precio base (CLP)</label>
              <Input
                type="number"
                placeholder="Ej: 100000"
                value={precioBase}
                onChange={e => setPrecioBase(e.target.value)}
                style={{ width: 160 }}
              />
            </div>
            <Button
              type="primary"
              onClick={calcularPrecios}
              loading={calculandoPrecios}
              disabled={!precioBase}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Calcular precios
            </Button>
            {precios.length > 0 && (
              <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>
                ✓ Precios calculados para {precios.length} zona{precios.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <Table
            dataSource={tablaData}
            columns={columnas}
            rowKey="idZona"
            pagination={false}
            size="small"
            rowClassName={row => {
              if (row.scoreCompuesto === maxScore) return 'row-highlight-green'
              if (row.scoreCompuesto === minScore) return 'row-highlight-red'
              return ''
            }}
          />
        </div>

        {/* SECCIÓN 5 — Patrón temporal */}
        <div className="section">
          <h3 className="section-title">Patrón temporal de detecciones</h3>
          {datosTemporales.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={datosTemporales} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="franja" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {nombresZonasTemporales.map(nombre => {
                  const zona = metricas.find(m => m.nombreZona === nombre)
                  return (
                    <Line
                      key={nombre}
                      type="monotone"
                      dataKey={nombre}
                      stroke={zona?.colorHexZona || PRIMARY}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              Datos temporales no disponibles
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
