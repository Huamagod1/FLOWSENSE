import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Table, Tag, Input, Button, Spin } from 'antd'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'

const COLORES_GRAFICOS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

export default function ResultadosPage() {
  const { id } = useParams()

  const [estado, setEstado] = useState('PROCESANDO')
  const [mensajeError, setMensajeError] = useState('')
  const [frameInfo, setFrameInfo] = useState(null)
  const [detecciones, setDetecciones] = useState([])
  const [metricas, setMetricas] = useState([])
  const [metricasTemporales, setMetricasTemporales] = useState([])
  const [precioBase, setPrecioBase] = useState('')
  const [precios, setPrecios] = useState([])
  const [calculandoPrecios, setCalculandoPrecios] = useState(false)

  const heatmapRef = useRef()
  const canvasRef = useRef()
  const heatmapInstanceRef = useRef()
  const reporteRef = useRef()

  const pollingActivo = estado !== 'COMPLETADO' && estado !== 'ERROR'

  async function consultarEstado() {
    try {
      const res = await api.get(`/videos/${id}/estado`)
      setEstado(res.data.estado)
      if (res.data.estado === 'ERROR') {
        setMensajeError(res.data.mensaje_error || 'Error en el análisis')
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
    api.get(`/videos/${id}/frame-preview`).then(res => setFrameInfo(res.data)).catch(() => {})
    api.get(`/videos/${id}/detecciones`).then(res => setDetecciones(res.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas`).then(res => setMetricas(res.data || [])).catch(() => {})
    api.get(`/videos/${id}/metricas-temporales`).then(res => setMetricasTemporales(res.data || [])).catch(() => {})
  }, [estado, id])

  useEffect(() => {
    if (estado !== 'COMPLETADO' || !detecciones.length || !canvasRef.current) return

    import('heatmap.js').then(mod => {
      const h337 = mod.default
      if (heatmapInstanceRef.current) {
        try { heatmapRef.current.innerHTML = '' } catch {}
      }
      const instance = h337.create({
        container: heatmapRef.current,
        radius: 30,
        maxOpacity: 0.6,
        minOpacity: 0,
        blur: 0.75,
      })
      heatmapInstanceRef.current = instance

      const w = heatmapRef.current.offsetWidth || 800
      const h = heatmapRef.current.offsetHeight || 450
      instance.setData({
        max: 10,
        data: detecciones.map(d => ({ x: Math.round(d.x * w), y: Math.round(d.y * h), value: 1 })),
      })
    })
  }, [detecciones, estado])

  async function calcularPrecios() {
    if (!precioBase) return
    setCalculandoPrecios(true)
    try {
      const res = await api.post(`/videos/${id}/precio-sugerido`, { precio_base: Number(precioBase) })
      setPrecios(res.data || [])
    } catch {
      setMensajeError('Error al calcular precios')
    } finally {
      setCalculandoPrecios(false)
    }
  }

  async function exportarPDF() {
    if (!reporteRef.current) return
    try {
      const canvas = await html2canvas(reporteRef.current, { scale: 1.5, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW - 20
      const imgH = (canvas.height * imgW) / canvas.width

      pdf.setFontSize(16)
      pdf.text('Reporte FlowSense', 10, 15)
      pdf.setFontSize(10)
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CL')}`, 10, 22)
      pdf.text(`Video ID: ${id}`, 10, 28)

      const imgY = 35
      if (imgH > pageH - imgY - 10) {
        pdf.addImage(imgData, 'PNG', 10, imgY, imgW, pageH - imgY - 10)
      } else {
        pdf.addImage(imgData, 'PNG', 10, imgY, imgW, imgH)
      }

      pdf.save(`reporte-flowsense-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      setMensajeError('Error al generar el PDF')
    }
  }

  const maxScore = metricas.length ? Math.max(...metricas.map(m => m.score || 0)) : null
  const minScore = metricas.length ? Math.min(...metricas.map(m => m.score || 0)) : null

  const tablaData = metricas.map(m => {
    const precioZona = precios.find(p => p.id_zona === m.zona_id || p.nombre === m.zona)
    return { ...m, precio_sugerido: precioZona?.precio_sugerido ?? null }
  })

  const totalDetecciones = metricas.reduce((s, m) => s + (m.detecciones || 0), 0)

  const columnas = [
    { title: 'Zona', dataIndex: 'zona', key: 'zona' },
    { title: 'Detecciones', dataIndex: 'detecciones', key: 'detecciones' },
    {
      title: '% Total', key: 'pct',
      render: (_, row) => totalDetecciones > 0 ? `${((row.detecciones / totalDetecciones) * 100).toFixed(1)}%` : '—'
    },
    { title: 'Tasa detención', dataIndex: 'tasa_detencion', key: 'tasa_detencion',
      render: v => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
    {
      title: 'Score', dataIndex: 'score', key: 'score',
      render: v => v != null ? v.toFixed(2) : '—',
      sorter: (a, b) => (a.score || 0) - (b.score || 0),
    },
    { title: 'Precio base', key: 'precio_base', render: () => precioBase ? `$${Number(precioBase).toLocaleString('es-CL')}` : '—' },
    {
      title: 'Precio sugerido', key: 'precio_sugerido',
      render: (_, row) => row.precio_sugerido != null
        ? `$${Number(row.precio_sugerido).toLocaleString('es-CL')}`
        : '—'
    },
  ]

  const zonas = [...new Set(metricasTemporales.flatMap(mt => Object.keys(mt).filter(k => k !== 'franja')))]

  const datosGrafico = metricasTemporales.map((mt, i) => ({
    franja: `Franja ${mt.franja ?? i + 1}`,
    ...mt,
  }))

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  const token = localStorage.getItem('flowsense_token')
  const frameUrl = `${baseUrl}/videos/${id}/frame-preview/imagen${token ? `?token=${token}` : ''}`

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
        <div className="page-header"><h2>Resultados del análisis</h2></div>
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
          <h2>Resultados del análisis</h2>
          <p className="text-muted">Video ID: {id}</p>
        </div>
        <Button onClick={exportarPDF} type="default">Exportar PDF</Button>
      </div>

      {mensajeError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{mensajeError}</div>}

      <div ref={reporteRef}>
        <div className="section">
          <h3 className="section-title">Mapa de calor</h3>
          <div
            ref={heatmapRef}
            style={{ position: 'relative', width: 800, height: 450, maxWidth: '100%', borderRadius: 4, overflow: 'hidden', border: '1px solid #e5e4e7' }}
          >
            <img
              src={frameUrl}
              alt="Frame del video"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        <div className="section">
          <h3 className="section-title">Métricas por zona</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
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
            <Button type="primary" onClick={calcularPrecios} loading={calculandoPrecios} disabled={!precioBase}>
              Calcular precios
            </Button>
          </div>

          <Table
            dataSource={tablaData}
            columns={columnas}
            rowKey="zona"
            pagination={false}
            rowClassName={row => {
              if (row.score === maxScore) return 'row-highlight-green'
              if (row.score === minScore) return 'row-highlight-red'
              return ''
            }}
          />
        </div>

        {datosGrafico.length > 0 && (
          <div className="section">
            <h3 className="section-title">Patrón temporal de detecciones</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="franja" />
                <YAxis />
                <Tooltip />
                <Legend />
                {zonas.map((zona, i) => (
                  <Bar key={zona} dataKey={zona} fill={COLORES_GRAFICOS[i % COLORES_GRAFICOS.length]} name={zona} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
