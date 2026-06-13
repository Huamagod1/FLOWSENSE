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
    return 'Alto tráfico + alta tasa de detención. Zona de interés — premium justificado.'
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
