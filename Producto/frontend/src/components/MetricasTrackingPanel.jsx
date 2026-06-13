import { Card, Statistic, Row, Col, Table } from 'antd'

const PRIMARY = '#7C3AED'
const fmt1 = n => (n != null ? n.toFixed(1) : '—')

export default function MetricasTrackingPanel({ metricas = [] }) {
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
              title="Personas únicas (suma por zona)"
              value={totalPersonasUnicas || '—'}
              valueStyle={{ color: PRIMARY, fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>suma por zona — una persona en 2 zonas cuenta en ambas</p>
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
              title="OTS total (tracking)"
              value={totalOts > 0 ? Math.round(totalOts) : '—'}
              valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>persona-segundos con tracking</p>
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
