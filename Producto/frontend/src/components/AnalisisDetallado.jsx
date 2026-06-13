import { useState, useEffect, useRef } from 'react'
import {
  Table, Card, Row, Col, Progress,
  Tooltip as AntTooltip, Collapse,
} from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const PRIMARY = '#7C3AED'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCeldaColor(n) {
  if (!n || n === 0) return '#F3F4F6'
  if (n <= 2) return '#bbf7d0'
  if (n <= 5) return '#fef08a'
  return '#fca5a5'
}

function getTasaInfo(tasa) {
  const pct = tasa != null ? tasa * 100 : null
  if (pct == null) return { pct: null, label: '—', sublabel: '', color: '#9ca3af' }
  if (pct < 20) return { pct, label: 'ZONA DE PASO', sublabel: 'Las personas cruzan rápidamente', color: '#dc2626' }
  if (pct < 50) return { pct, label: 'INTERÉS MODERADO', sublabel: 'Tránsito con pausas ocasionales', color: '#d97706' }
  return { pct, label: 'ZONA DE INTERÉS', sublabel: 'Las personas se detienen — alta exposición', color: '#16a34a' }
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"
      style={{ color: '#9ca3af', cursor: 'help', verticalAlign: 'middle', marginLeft: 3 }}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  )
}

// Paleta continua tipo heatmap: azul → cyan → verde → amarillo → naranja → rojo
const HEAT_STOPS = [
  { t: 0.0,  c: [59,  130, 246] }, // azul   (bajo)
  { t: 0.25, c: [6,   182, 212] }, // cyan
  { t: 0.45, c: [16,  185, 129] }, // verde
  { t: 0.65, c: [250, 204, 21]  }, // amarillo
  { t: 0.82, c: [249, 115, 22]  }, // naranja
  { t: 1.0,  c: [220, 38,  38]  }, // rojo   (alto)
]

// Mapea una intensidad normalizada [0-1] a un color de la paleta + alpha
function heatColorFromIntensity(t) {
  const v = Math.max(0, Math.min(1, t))
  let lo = HEAT_STOPS[0]
  let hi = HEAT_STOPS[HEAT_STOPS.length - 1]
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (v >= HEAT_STOPS[i].t && v <= HEAT_STOPS[i + 1].t) {
      lo = HEAT_STOPS[i]
      hi = HEAT_STOPS[i + 1]
      break
    }
  }
  const span = (hi.t - lo.t) || 1
  const f = (v - lo.t) / span
  const r = Math.round(lo.c[0] + (hi.c[0] - lo.c[0]) * f)
  const g = Math.round(lo.c[1] + (hi.c[1] - lo.c[1]) * f)
  const b = Math.round(lo.c[2] + (hi.c[2] - lo.c[2]) * f)
  const a = Math.round(Math.min(1, 0.35 + v * 0.55) * 255) // más opaco donde más caliente
  return { r, g, b, a }
}

function ColHeader({ label, tooltip }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {label}
      <AntTooltip title={tooltip} placement="top"><InfoIcon /></AntTooltip>
    </span>
  )
}

function TooltipRanking({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const m = payload[0]?.payload
  const ratio = m._avg > 0 ? (m.totalDetecciones / m._avg).toFixed(1) : '—'
  const pct = m._total > 0 ? ((m.totalDetecciones / m._total) * 100).toFixed(1) : '—'
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e4e7', padding: '10px 14px', borderRadius: 8, fontSize: 13, maxWidth: 280 }}>
      <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{label}</p>
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        <b>{m.totalDetecciones}</b> persona-segundos · <b>{pct}%</b> del total · <b>{ratio}x</b> el promedio.
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Props: metricas, metricasTemporales, detecciones, frameSrc
 */
export default function AnalisisDetallado({ metricas, metricasTemporales, detecciones, frameSrc }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const canvasRef = useRef()
  const imgRef    = useRef()

  // ── Datos derivados ────────────────────────────────────────────────────────
  const totalDetecciones = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const avgDetecciones   = metricas.length ? totalDetecciones / metricas.length : 0
  const maxScore = metricas.length ? Math.max(...metricas.map(m => m.scoreCompuesto || 0)) : null
  const minScore = metricas.length ? Math.min(...metricas.map(m => m.scoreCompuesto || 0)) : null

  const metricasOrdenadas = [...metricas].sort((a, b) => {
    const d = (b.totalDetecciones || 0) - (a.totalDetecciones || 0)
    return d !== 0 ? d : (b.scoreCompuesto || 0) - (a.scoreCompuesto || 0)
  })
  const zonaMasActiva    = metricasOrdenadas[0] ?? null
  const zonaMenosActiva  = metricasOrdenadas[metricasOrdenadas.length - 1] ?? null
  const hayEmpate        = zonaMasActiva && zonaMenosActiva && zonaMasActiva.idZona === zonaMenosActiva.idZona
  const tasaPromedio     = metricas.length
    ? metricas.reduce((s, m) => s + (m.tasaDetencion || 0), 0) / metricas.length
    : null

  const rankingData = metricasOrdenadas.map(m => ({
    ...m, _avg: avgDetecciones, _total: totalDetecciones,
  }))

  // Heatmap temporal
  const franjas        = [...new Set(metricasTemporales.map(mt => mt.franjaNumero))].sort((a, b) => a - b)
  const franjaLabels   = {}
  metricasTemporales.forEach(mt => { franjaLabels[mt.franjaNumero] = `${mt.segundoInicio}-${mt.segundoFin}s` })
  const matrizTemporal = {}
  metricasTemporales.forEach(mt => {
    if (!matrizTemporal[mt.idZona]) matrizTemporal[mt.idZona] = {}
    matrizTemporal[mt.idZona][mt.franjaNumero] = mt.totalDetecciones
  })
  const franjasTotals  = franjas.map(f =>
    metricasTemporales.filter(mt => mt.franjaNumero === f).reduce((s, mt) => s + (mt.totalDetecciones || 0), 0),
  )
  const maxFranja      = franjasTotals.length ? Math.max(...franjasTotals) : 0
  const avgFranja      = franjasTotals.length ? franjasTotals.reduce((a, b) => a + b, 0) / franjasTotals.length : 0
  const esIrregular    = avgFranja > 0 && maxFranja / avgFranja > 2.5

  // Tabla resumen (sin precios — los precios están en RecomendacionPrecio)
  const columnas = [
    {
      title: <ColHeader label="Zona" tooltip="Área del recinto definida por el administrador" />,
      dataIndex: 'nombreZona', key: 'nombreZona',
      render: (nombre, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.colorHexZona || PRIMARY, flexShrink: 0 }} />
          {nombre}
        </span>
      ),
    },
    {
      title: <ColHeader label="Detecciones" tooltip="El sistema muestrea a 10 cuadros por segundo; los tiempos mostrados están convertidos a segundos reales." />,
      dataIndex: 'totalDetecciones', key: 'totalDetecciones',
    },
    {
      title: <ColHeader label="% Total" tooltip="Porcentaje del tráfico total del recinto" />,
      key: 'pct',
      render: (_, row) => totalDetecciones > 0
        ? `${((row.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%` : '—',
    },
    {
      title: <ColHeader label="Tasa detención" tooltip="Porcentaje de detecciones donde la persona aparece quieta" />,
      key: 'tasa',
      render: (_, row) => row.tasaDetencion != null
        ? `${(row.tasaDetencion * 100).toFixed(0)}%` : '—',
    },
    {
      title: <ColHeader label="Score" tooltip="Score compuesto de valor comercial. 1.0 = promedio del recinto." />,
      dataIndex: 'scoreCompuesto', key: 'scoreCompuesto',
      render: v => v != null ? <b style={{ color: PRIMARY }}>{v.toFixed(2)}x</b> : '—',
    },
  ]

  // Conclusiones
  function generarConclusiones() {
    if (!metricas.length || !zonaMasActiva || !zonaMenosActiva || hayEmpate) return null
    const pctMayor  = totalDetecciones > 0 ? ((zonaMasActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1) : null
    const pctMenor  = totalDetecciones > 0 ? ((zonaMenosActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1) : null
    const scoreMayor = zonaMasActiva.scoreCompuesto?.toFixed(2) ?? null
    const scoreMenor = zonaMenosActiva.scoreCompuesto?.toFixed(2) ?? null
    const precioDif  = (scoreMayor && scoreMenor && Number(scoreMenor) > 0)
      ? (Number(scoreMayor) / Number(scoreMenor)).toFixed(1) : null
    const tasaPct   = tasaPromedio != null ? (tasaPromedio * 100).toFixed(1) : null
    let tasaComentario = ''
    if (tasaPct != null) {
      if (Number(tasaPct) >= 40) tasaComentario = 'Las personas tienden a detenerse, indicando interés en vitrinas o productos.'
      else if (Number(tasaPct) >= 20) tasaComentario = 'Flujo mixto: parte de paso, parte con detención breve.'
      else tasaComentario = 'Las personas están mayormente de paso. Considera elementos que retengan la atención.'
    }
    return { pctMayor, pctMenor, scoreMayor, scoreMenor, precioDif, tasaPct, tasaComentario }
  }
  const conclusiones = generarConclusiones()

  // Oportunidades y alertas
  const oportunidades = (() => {
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
        items.push(`Zona ${m.nombreZona} muestra alta atención (${(m.tasaDetencion * 100).toFixed(0)}%) — ideal para retail premium`)
    })
    return items
  })()

  const alertas = (() => {
    const items = []
    metricas.forEach(m => {
      if (totalDetecciones > 0 && (m.totalDetecciones / totalDetecciones) * 100 < 10)
        items.push(`Zona ${m.nombreZona} subutilizada (<10% del tráfico), considerar reorganización o promoción`)
    })
    const scorePromedio = metricas.length
      ? metricas.reduce((s, m) => s + (m.scoreCompuesto || 0), 0) / metricas.length : null
    if (scorePromedio != null && scorePromedio < 0.8)
      items.push('Recinto con tráfico bajo — evaluar estrategias globales de afluencia')
    if (esIrregular)
      items.push('Tráfico inconsistente entre franjas — considerar pricing diferenciado por horario')
    return items
  })()

  // ── Heatmap canvas — densidad real de puntos de detección ────────────────
  // Dos pasadas: (1) acumular intensidad en escala de grises con additive
  // blending; (2) remapear el alpha acumulado a la paleta de colores heatmap.
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !detecciones.length) return
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!img) return
    // Usar naturalWidth como fallback cuando la tab está oculta (offsetWidth === 0)
    canvas.width  = img.offsetWidth  > 0 ? img.offsetWidth  : (img.naturalWidth  || 0)
    canvas.height = img.offsetHeight > 0 ? img.offsetHeight : (img.naturalHeight || 0)
    if (canvas.width === 0 || canvas.height === 0) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Pasada 1: acumular densidad ──────────────────────────────────────
    // Cada punto pinta un gradiente radial negro semitransparente. Con
    // globalCompositeOperation 'lighter' los puntos cercanos suman su alpha,
    // así las áreas con más detecciones quedan más opacas.
    const radius = 18
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    detecciones.forEach(d => {
      const x = Number(d.x) * canvas.width
      const y = Number(d.y) * canvas.height
      if (!isFinite(x) || !isFinite(y)) return
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, 'rgba(0,0,0,0.18)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()

    // ── Pasada 2: remapear intensidad acumulada (alpha) a colores ────────
    try {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data  = image.data

      // Normalizar contra el percentil 85 (no el máximo absoluto) para que el
      // rojo se reserve a los puntos realmente más densos y la paleta se
      // distribuya mejor. Los valores por encima del percentil se clampean a 1.
      const alphas = []
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) alphas.push(data[i])
      }
      if (alphas.length === 0) return
      alphas.sort((p, q) => p - q)
      const refAlpha = alphas[Math.floor(alphas.length * 0.85)] || alphas[alphas.length - 1]
      if (refAlpha === 0) return

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3]
        if (alpha === 0) continue
        const { r, g, b, a } = heatColorFromIntensity(alpha / refAlpha)
        data[i]     = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = a
      }
      ctx.putImageData(image, 0, 0)
    } catch {
      // getImageData puede fallar (canvas "tainted"): el frame se muestra
      // con la capa de densidad en gris, sin el remapeo de color.
    }
  }, [imgLoaded, detecciones])

  function renderBarLabel({ x, y, width, height, value, index }) {
    const m = rankingData[index]
    if (!m) return null
    const ratio = avgDetecciones > 0 ? (m.totalDetecciones / avgDetecciones).toFixed(1) : '—'
    return (
      <text x={x + width + 6} y={y + height / 2} fill="#374151" fontSize={11} dominantBaseline="middle">
        {value} ({ratio}x)
      </text>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Mapa de calor ────────────────────────────────────────────── */}
      <div className="section">
        <h3 className="section-title">Mapa de calor — Concentración de tráfico peatonal</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Las zonas con tonos rojos/naranjas indican mayor exposición comercial.
        </p>
        <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 800, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e4e7' }}>
          {frameSrc
            ? <img ref={imgRef} src={frameSrc} alt="Frame del video" style={{ width: '100%', display: 'block', opacity: 0.55 }} onLoad={() => setImgLoaded(true)} />
            : <div style={{ width: '100%', paddingBottom: '56.25%', background: '#1f2028' }} />
          }
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Bajo tráfico</span>
          {[
            { color: '#3b82f6', opacity: 0.3 },
            { color: '#06b6d4', opacity: 0.5 },
            { color: '#facc15', opacity: 0.7 },
            { color: '#f97316', opacity: 0.8 },
            { color: '#dc2626', opacity: 0.9 },
          ].map(({ color, opacity }) => (
            <div key={color} style={{ width: 28, height: 14, borderRadius: 3, background: color, opacity }} />
          ))}
          <span style={{ fontSize: 12, color: '#6b7280' }}>Alto tráfico</span>
        </div>
      </div>

      {/* ── Ranking de tráfico ────────────────────────────────────────── */}
      {metricas.length > 0 && (
        <div className="section">
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Ranking de tráfico comercial</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Comparación directa de persona-segundos entre zonas.
            </p>
            <ResponsiveContainer width="100%" height={Math.max(120, rankingData.length * 52)}>
              <BarChart layout="vertical" data={rankingData} margin={{ top: 4, right: 140, left: 8, bottom: 16 }}>
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
                  {rankingData.map(m => <Cell key={m.idZona} fill={m.colorHexZona || PRIMARY} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {!hayEmpate && zonaMasActiva && zonaMenosActiva && totalDetecciones > 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 6, fontSize: 13, lineHeight: 1.8 }}>
                <div>💼 <b>{zonaMasActiva.nombreZona}</b> concentra <b>{((zonaMasActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%</b> del tráfico → cobrar premium</div>
                <div>📍 <b>{zonaMenosActiva.nombreZona}</b> concentra <b>{((zonaMenosActiva.totalDetecciones / totalDetecciones) * 100).toFixed(1)}%</b> del tráfico → considerar incentivos</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Comportamiento del visitante ──────────────────────────────── */}
      {metricas.length > 0 && (
        <div className="section">
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>🚶 Comportamiento del visitante por zona</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
              Identifica si las zonas funcionan como corredores de tránsito o como espacios de exploración comercial.
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

      {/* ── Distribución temporal ─────────────────────────────────────── */}
      <div className="section">
        <Card>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>⏰ Distribución temporal del tráfico</h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
            Identifica franjas horarias críticas para pricing diferenciado.
          </p>
          {franjas.length > 0 && metricas.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `140px repeat(${franjas.length}, minmax(52px, 1fr))`,
                  gap: 3, minWidth: 360,
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
                          title={`${zona.nombreZona} · ${franjaLabels[f] || `Franja ${f}`}: ${n} det.`}>
                          <div style={{
                            background: getCeldaColor(n), borderRadius: 4, textAlign: 'center',
                            fontSize: 12, fontWeight: n > 0 ? 600 : 400,
                            color: n > 5 ? '#7f1d1d' : '#374151', padding: '8px 4px', cursor: 'default',
                          }}>
                            {n}
                          </div>
                        </AntTooltip>
                      )
                    }),
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
                  ⚠️ Para análisis horario detallado se recomiendan videos de al menos 30 minutos.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              ⚠️ Patrón temporal no disponible. El video actual es muy corto para identificar tendencias horarias.
            </p>
          )}
        </Card>
      </div>

      {/* ── Tabla resumen ─────────────────────────────────────────────── */}
      {metricas.length > 0 && (
        <div className="section">
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Vista tabular resumen</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Resumen numérico comparativo de todas las zonas.
            </p>
            <Table
              dataSource={metricas}
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
          </Card>
        </div>
      )}

      {/* ── Resumen ejecutivo ─────────────────────────────────────────── */}
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
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Sin alertas activas. Distribución equilibrada.</p>
                )}
              </Col>
              <Col xs={24} md={8}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: PRIMARY }}>🚀 Próximos pasos</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.9, color: '#374151' }}>
                  <li>Compartir reporte con arrendatarios</li>
                  <li>Negociar precios sugeridos con datos en mano</li>
                  <li>Repetir análisis en distinto horario para validar patrón</li>
                  <li>Grabar video de día de mayor afluencia</li>
                </ul>
              </Col>
            </Row>
          </Card>
        </div>
      )}

      {/* ── Conclusiones ──────────────────────────────────────────────── */}
      {conclusiones && (
        <div className="section">
          <Card title="🎯 Conclusiones del análisis" style={{ borderRadius: 8, borderTop: `3px solid ${PRIMARY}` }}>
            <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
              La zona <b>{zonaMasActiva?.nombreZona}</b> concentra el <b>{conclusiones.pctMayor}%</b> del
              tráfico total con un score de <b>{conclusiones.scoreMayor}</b>.
              {conclusiones.precioDif && <> Se sugiere un precio <b>{conclusiones.precioDif}x</b> mayor que la zona de menor tráfico.</>}
            </p>
            <p style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
              La zona <b>{zonaMenosActiva?.nombreZona}</b> muestra el <b>{conclusiones.pctMenor}%</b> con
              score <b>{conclusiones.scoreMenor}</b>. Considera estrategias de aumento de visibilidad o ajuste de precio.
            </p>
            {conclusiones.tasaPct != null && (
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Tasa promedio de detención: <b>{conclusiones.tasaPct}%</b>. {conclusiones.tasaComentario}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── Nota metodológica ─────────────────────────────────────────── */}
      <div className="section">
        <Collapse
          ghost
          items={[
            {
              key: 'metodologia',
              label: <span style={{ fontSize: 13, color: '#6b7280' }}>ⓘ Nota metodológica</span>,
              children: (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9, color: '#374151' }}>
                  <li><b>Personas únicas:</b> número de individuos distintos detectados con tracking anónimo (ByteTrack). Se cuentan por zona; una persona que recorre dos zonas suma en ambas.</li>
                  <li><b>Persona-segundos (OTS):</b> tiempo total de exposición. El sistema muestrea a 10 cuadros por segundo; los tiempos se convierten a segundos reales.</li>
                  <li><b>Tasa de detención:</b> porcentaje de detecciones donde la persona estaba prácticamente quieta. Indica interés (vitrinas) frente a paso.</li>
                  <li><b>Score compuesto:</b> índice de valor comercial relativo al promedio del recinto, combinando tráfico (40%), detención (30%), densidad (20%) y consistencia (10%).</li>
                  <li><b>Precio sugerido:</b> precio base × score. Es orientativo; la decisión final es del administrador.</li>
                </ul>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
