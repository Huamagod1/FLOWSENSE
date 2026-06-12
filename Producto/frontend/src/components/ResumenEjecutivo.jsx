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
