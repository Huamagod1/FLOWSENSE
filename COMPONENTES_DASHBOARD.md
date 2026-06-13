# ResumenEjecutivo.jsx

```jsx
import { Card, Row, Col, Statistic } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const PRIMARY = '#7C3AED'

export default function ResumenEjecutivo({ metricas, metricasTracking, zones }) {
  if (!metricas?.length) return null

  const totalDetecciones = metricas.reduce((s, m) => s + (m.totalDetecciones || 0), 0)
  const hayTracking = metricasTracking?.some(t => (t.personasUnicas || 0) > 0)

  // Personas únicas: suma por zona del tracking (sobre-estima si personas cruzaron varias zonas)
  const totalPersonas = hayTracking
    ? metricasTracking.reduce((s, t) => s + (t.personasUnicas || 0), 0)
    : 0

  // Permanencia promedio ponderada por zona
  const permanenciaProm = hayTracking && metricasTracking.length
    ? (metricasTracking.reduce((s, t) => s + (t.tiempoPermanenciaProm || 0), 0) / metricasTracking.length)
    : null

  // Zona top por personas únicas o por detecciones si no hay tracking
  const zonaTop = hayTracking
    ? [...metricasTracking].sort((a, b) => (b.personasUnicas || 0) - (a.personasUnicas || 0))[0]
    : metricas.reduce((mx, m) => (m.totalDetecciones || 0) > (mx.totalDetecciones || 0) ? m : mx, metricas[0])

  // ── Datos para ranking por personas únicas ─────────────────────────────────
  const dataPersonas = [...metricas]
    .map(m => {
      const t = metricasTracking?.find(t => t.idZona === m.idZona)
      return {
        nombre: m.nombreZona,
        color: m.colorHexZona || PRIMARY,
        personas: t?.personasUnicas || 0,
        detecciones: m.totalDetecciones || 0,
      }
    })
    .sort((a, b) => (hayTracking ? b.personas - a.personas : b.detecciones - a.detecciones))

  // ── Datos para ranking por permanencia ────────────────────────────────────
  const dataPermanencia = [...metricas]
    .map(m => {
      const t = metricasTracking?.find(t => t.idZona === m.idZona)
      return {
        nombre: m.nombreZona,
        color: m.colorHexZona || PRIMARY,
        permanencia: +(t?.tiempoPermanenciaProm || 0).toFixed(1),
      }
    })
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

---

# RecomendacionPrecio.jsx

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

---

# AnalisisDetallado.jsx

```jsx
import { useState, useEffect, useRef } from 'react'
import {
  Table, Card, Row, Col, Progress,
  Tooltip as AntTooltip,
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

function getHeatColor(normalized) {
  if (normalized <= 0.2) return { r: 59,  g: 130, b: 246, a: 0.3 }
  if (normalized <= 0.4) return { r: 6,   g: 182, b: 212, a: 0.5 }
  if (normalized <= 0.6) return { r: 250, g: 204, b: 21,  a: 0.7 }
  if (normalized <= 0.8) return { r: 249, g: 115, b: 22,  a: 0.8 }
  return                        { r: 220, g: 38,  b: 38,  a: 0.9 }
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
 * Props: metricas, metricasTemporales, detecciones, frameSrc, zones
 */
export default function AnalisisDetallado({ metricas, metricasTemporales, detecciones, frameSrc, zones }) {
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
      title: <ColHeader label="Detecciones" tooltip="Persona-segundos. Cada detección = 1 segundo de presencia humana." />,
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

  // ── Heatmap canvas — escala por personas únicas por zona ─────────────────
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !metricas.length || !zones.length) return
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!img) return
    // Usar naturalWidth como fallback cuando la tab está oculta (offsetWidth === 0)
    canvas.width  = img.offsetWidth  > 0 ? img.offsetWidth  : (img.naturalWidth  || 0)
    canvas.height = img.offsetHeight > 0 ? img.offsetHeight : (img.naturalHeight || 0)
    if (canvas.width === 0 || canvas.height === 0) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const metricaMap = {}
    metricas.forEach(m => { metricaMap[m.idZona] = m })

    const values = zones.map(z => metricaMap[z.id]?.personasUnicas ?? 0)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range  = maxVal - minVal
    const normalize = v => range === 0 ? 0.5 : (v - minVal) / range

    try {
      zones.forEach(z => {
        const cx  = (z.xNorm + z.anchoNorm / 2) * canvas.width
        const cy  = (z.yNorm + z.altoNorm  / 2) * canvas.height
        if (!isFinite(cx) || !isFinite(cy)) return
        const val = metricaMap[z.id]?.personasUnicas ?? 0
        const n   = normalize(val)
        const { r, g, b, a } = getHeatColor(n)
        const radioBase = Math.min(z.anchoNorm, z.altoNorm) * 0.4
        const radiusPx  = radioBase * Math.min(canvas.width, canvas.height)
        const radius    = radiusPx * (0.6 + n * 0.4)
        if (!isFinite(radius) || radius <= 0) return
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
        gradient.addColorStop(0, `rgba(${r},${g},${b},${a})`)
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fill()
      })
    } catch {
      // Error en canvas: el frame se muestra sin heatmap superpuesto
    }
  }, [imgLoaded, metricas, zones])

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
    </div>
  )
}
```

---

# MetricasTrackingPanel.jsx

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
