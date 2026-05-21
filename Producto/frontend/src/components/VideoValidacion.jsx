import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, Progress, Table, Button, Spin } from 'antd'
import { fetchOverlayBlobUrl, getEventos, eliminarVideoOriginal } from '../api/validacion'

const VENTANA_SEG = 5

const COLUMNAS_EVENTOS = [
  {
    title: 'Tiempo',
    dataIndex: 'tiempo',
    key: 'tiempo',
    width: 72,
    render: v => `${Number(v).toFixed(1)}s`,
  },
  { title: 'Frame', dataIndex: 'frame', key: 'frame', width: 64 },
  { title: 'Track', dataIndex: 'trackId', key: 'trackId', width: 60 },
  {
    title: 'Tipo',
    dataIndex: 'tipo',
    key: 'tipo',
    width: 88,
    render: v => (
      <span style={{
        color: v === 'ENTRADA' ? '#16a34a' : v === 'SALIDA' ? '#dc2626' : '#6b7280',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.04em',
      }}>
        {v}
      </span>
    ),
  },
  { title: 'Zona', dataIndex: 'zonaId', key: 'zonaId', width: 55 },
  {
    title: 'Conf.',
    dataIndex: 'confianza',
    key: 'confianza',
    width: 55,
    render: v => `${(Number(v) * 100).toFixed(0)}%`,
  },
]

const NIVEL_COLOR = { ALTO: '#16a34a', MEDIO: '#d97706', BAJO: '#dc2626' }

/**
 * Props:
 *   videoId      — id del video
 *   confiabilidad — objeto ConfiabilidadResponse del backend (puede ser null para videos legacy)
 */
export default function VideoValidacion({ videoId, confiabilidad }) {
  const [overlaySrc, setOverlaySrc]     = useState(null)
  const [overlayLoading, setOverlayLoading] = useState(true)
  const [overlayError, setOverlayError] = useState(false)
  const [eventos, setEventos]           = useState([])
  const [currentTime, setCurrentTime]   = useState(0)
  const [eliminando, setEliminando]     = useState(false)
  const [eliminado, setEliminado]       = useState(false)
  const videoRef = useRef()

  // ── Carga el overlay como blob URL (autenticado con JWT) ───────────────────
  useEffect(() => {
    if (!confiabilidad?.overlayDisponible) {
      setOverlayLoading(false)
      return
    }
    let objectUrl = null
    fetchOverlayBlobUrl(videoId)
      .then(url => { objectUrl = url; setOverlaySrc(url) })
      .catch(() => setOverlayError(true))
      .finally(() => setOverlayLoading(false))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [videoId, confiabilidad?.overlayDisponible])

  // ── Carga los primeros 500 eventos ─────────────────────────────────────────
  useEffect(() => {
    getEventos(videoId, 0, 999999)
      .then(r => setEventos(r.data?.eventos || []))
      .catch(() => {})
  }, [videoId])

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  // ── Eventos en ventana ±VENTANA_SEG del tiempo actual ────────────────────
  const eventosVentana = useMemo(
    () => eventos.filter(e => Math.abs(e.tiempo - currentTime) <= VENTANA_SEG),
    [eventos, currentTime],
  )

  const statsFrame = useMemo(() => ({
    detecciones: eventosVentana.length,
    tracks: new Set(eventosVentana.map(e => e.trackId)).size,
  }), [eventosVentana])

  // Acumulado sobre todos los eventos cargados
  const statsAcum = useMemo(() => ({
    personasUnicas: new Set(
      eventos.filter(e => e.tipo === 'ENTRADA').map(e => e.trackId),
    ).size,
    totalDetecciones: eventos.length,
  }), [eventos])

  // ── Eliminar video ─────────────────────────────────────────────────────────
  async function handleEliminar() {
    if (!window.confirm(
      '¿Eliminar el video original y el overlay?\n\nLas métricas y detecciones quedan intactas.',
    )) return
    setEliminando(true)
    try {
      await eliminarVideoOriginal(videoId)
      setEliminado(true)
      if (overlaySrc) URL.revokeObjectURL(overlaySrc)
      setOverlaySrc(null)
    } catch {
      alert('No se pudo eliminar el video. Inténtalo de nuevo.')
    } finally {
      setEliminando(false)
    }
  }

  const colorConf = NIVEL_COLOR[confiabilidad?.nivelConfiabilidad] || '#9ca3af'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Narrativa explicativa */}
      <Card style={{ marginBottom: 16, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
          <b>¿Cómo funciona esta vista?</b> El video procesado muestra las detecciones y
          trayectorias de cada persona detectada. Usa los controles del reproductor para
          revisar momentos específicos. La tabla de eventos se sincroniza con el tiempo
          actual (ventana ±{VENTANA_SEG}s). Verifica visualmente que el modelo cuenta
          correctamente <b>antes</b> de confiar en los precios sugeridos.
        </p>
      </Card>

      {/* Layout: video izquierda | panel derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 16 }}>

        {/* ── Video player ───────────────────────────────────────────────── */}
        <div style={{
          borderRadius: 8, overflow: 'hidden', background: '#1f2028',
          minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {eliminado ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Video eliminado</p>
              <p style={{ fontSize: 12, margin: 0 }}>
                Las métricas y detecciones siguen disponibles en las otras pestañas.
              </p>
            </div>
          ) : overlayLoading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
              <Spin size="large" />
              <p style={{ marginTop: 16, fontSize: 13 }}>Cargando video procesado…</p>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                Puede tardar según el tamaño del archivo.
              </p>
            </div>
          ) : !confiabilidad?.overlayDisponible || overlayError ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', maxWidth: 380 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📹</div>
              <p style={{ fontWeight: 600, marginBottom: 8, color: '#4b5563' }}>
                Video con overlay no disponible
              </p>
              <p style={{ fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                {overlayError
                  ? 'No se pudo cargar el archivo. Puede que haya sido eliminado o el análisis no generó overlay.'
                  : 'Este análisis fue procesado antes de la funcionalidad de overlay, o el video fue eliminado manualmente.'}
              </p>
              <p style={{ fontSize: 12, margin: '10px 0 0', color: '#9ca3af' }}>
                Las métricas, eventos y las demás pestañas siguen disponibles.
              </p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={overlaySrc}
              controls
              onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', display: 'block', maxHeight: 500 }}
            />
          )}
        </div>

        {/* ── Panel de estadísticas ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Frame actual */}
          <Card size="small" title={
            <span style={{ fontSize: 12, color: '#374151' }}>
              En este momento ({currentTime.toFixed(0)}s)
            </span>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox value={statsFrame.detecciones} label="Detecciones" color="#7C3AED" bg="#f5f3ff" />
              <StatBox value={statsFrame.tracks} label="Tracks" color="#7C3AED" bg="#f5f3ff" />
            </div>
          </Card>

          {/* Acumulado */}
          <Card size="small" title={
            <span style={{ fontSize: 12, color: '#374151' }}>
              Acumulado ({eventos.length} eventos cargados)
            </span>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox value={statsAcum.personasUnicas} label="P. únicas" color="#16a34a" bg="#f0fdf4" />
              <StatBox value={statsAcum.totalDetecciones} label="Eventos" color="#2563eb" bg="#eff6ff" />
            </div>
          </Card>

          {/* Confiabilidad */}
          {confiabilidad ? (
            <Card size="small" title={
              <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: colorConf, display: 'inline-block', flexShrink: 0,
                }} />
                Confiabilidad —{' '}
                <b style={{ color: colorConf }}>
                  {confiabilidad.nivelConfiabilidad || '—'}
                </b>
              </span>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ConfBar
                  label="Confianza modelo"
                  value={confiabilidad.confianzaPromedio}
                  color={colorConf}
                />
                <ConfBar
                  label="Calidad tracking"
                  value={confiabilidad.calidadTracking}
                  color={colorConf}
                />
                <ConfBar
                  label="Score global"
                  value={confiabilidad.scoreConfiabilidad}
                  color={colorConf}
                />
              </div>
            </Card>
          ) : (
            <Card size="small">
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                Datos de confiabilidad no disponibles para este análisis.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ── Tabla de eventos sincronizados ─────────────────────────────────── */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <span style={{ fontSize: 13 }}>
            Eventos en ventana actual
            {' '}(±{VENTANA_SEG}s · t={currentTime.toFixed(1)}s){' '}
            <span style={{ color: '#6b7280', fontWeight: 400 }}>
              — {eventosVentana.length} evento{eventosVentana.length !== 1 ? 's' : ''}
            </span>
          </span>
        }
      >
        {eventos.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0', margin: 0 }}>
            No hay datos de eventos para este análisis.
          </p>
        ) : (
          <Table
            dataSource={eventosVentana}
            columns={COLUMNAS_EVENTOS}
            rowKey={(_, i) => i}
            pagination={false}
            size="small"
            scroll={{ y: 200 }}
            locale={{
              emptyText: 'No hay eventos en este momento. Avanza el reproductor para ver eventos.',
            }}
          />
        )}
      </Card>

      {/* ── Botón eliminar video ───────────────────────────────────────────── */}
      {!eliminado && confiabilidad?.videoOriginalDisponible !== false && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button danger size="small" onClick={handleEliminar} loading={eliminando}>
            Eliminar video original
          </Button>
        </div>
      )}
    </div>
  )
}

function StatBox({ value, label, color, bg }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', background: bg, borderRadius: 6 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function ConfBar({ label, value, color }) {
  const pct = value != null ? Math.round(value * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <b>{value != null ? `${pct}%` : '—'}</b>
      </div>
      <Progress percent={pct} strokeColor={color} showInfo={false} size="small" />
    </div>
  )
}
