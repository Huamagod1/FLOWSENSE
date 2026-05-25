import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, Progress, Table, Button, Spin, Tooltip } from 'antd'
import { fetchOverlayBlobUrl, getEventos, eliminarVideoOriginal } from '../api/validacion'

const VENTANA_SEG = 5
const TOLERANCIA_FRAME = 0.8

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

const TEXTOS_NIVEL = {
  ALTO: 'Análisis confiable. Los datos pueden usarse para tomar decisiones comerciales.',
  MEDIO: 'Análisis con limitaciones menores. Recomendamos revisar visualmente algunas detecciones en la tab de Validación.',
  BAJO: 'El video tiene condiciones difíciles. Los resultados deben usarse con cautela. Considera repetir el análisis con mejor calidad de video o ajustando las zonas.',
}

const TOOLTIPS_CONF = {
  confianzaModelo: 'Probabilidad promedio que el modelo asigna a sus detecciones. Mayor a 70% se considera confiable. Menor a 50% indica condiciones difíciles del video (poca luz, ángulo poco favorable, mucho movimiento).',
  calidadTracking: 'Porcentaje de personas que el sistema pudo seguir correctamente sin perderlas. Mayor a 80% indica que el conteo de personas únicas es confiable.',
  scoreGlobal: 'Promedio ponderado de confianza y calidad. Determina el nivel general del análisis: ALTO (>80%), MEDIO (60-80%), BAJO (<60%).',
}

/**
 * Props:
 *   videoId      — id del video
 *   confiabilidad — objeto ConfiabilidadResponse del backend (puede ser null para videos legacy)
 */
export default function VideoValidacion({ videoId, confiabilidad }) {
  const [overlaySrc, setOverlaySrc]         = useState(null)
  const [overlayLoading, setOverlayLoading] = useState(true)
  const [overlayError, setOverlayError]     = useState(false)
  const [eventos, setEventos]               = useState([])
  const [currentTime, setCurrentTime]       = useState(0)
  const [eliminando, setEliminando]         = useState(false)
  const [eliminado, setEliminado]           = useState(false)
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

  // ── Carga todos los eventos ────────────────────────────────────────────────
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

  // ── Eventos en el frame actual (tolerancia estricta) ──────────────────────
  const eventosCurrent = useMemo(
    () => eventosVentana.filter(e => Math.abs(e.tiempo - currentTime) <= TOLERANCIA_FRAME),
    [eventosVentana, currentTime],
  )

  // ── Texto narrativo del momento actual ────────────────────────────────────
  const narrativa = useMemo(() => {
    const mm = Math.floor(currentTime / 60).toString().padStart(2, '0')
    const ss = Math.floor(currentTime % 60).toString().padStart(2, '0')
    const ts = `${mm}:${ss}`
    const tracksActivos = new Set(eventosVentana.map(e => e.trackId)).size

    if (eventosCurrent.length === 0) {
      return `${ts} — ${tracksActivos} persona${tracksActivos !== 1 ? 's' : ''} activa${tracksActivos !== 1 ? 's' : ''} en ventana`
    }
    const acciones = eventosCurrent
      .map(e => {
        const verbo = e.tipo === 'ENTRADA' ? 'entró a' : e.tipo === 'SALIDA' ? 'salió de' : 'en'
        return `Persona #${e.trackId} ${verbo} Zona ${e.zonaId}`
      })
      .join(' · ')
    return `${ts} — ${acciones} · ${tracksActivos} activa${tracksActivos !== 1 ? 's' : ''}`
  }, [eventosCurrent, eventosVentana, currentTime])

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
  const textoNivel = TEXTOS_NIVEL[confiabilidad?.nivelConfiabilidad]

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
                  tooltip={TOOLTIPS_CONF.confianzaModelo}
                />
                <ConfBar
                  label="Calidad tracking"
                  value={confiabilidad.calidadTracking}
                  color={colorConf}
                  tooltip={TOOLTIPS_CONF.calidadTracking}
                />
                <ConfBar
                  label="Score global"
                  value={confiabilidad.scoreConfiabilidad}
                  color={colorConf}
                  tooltip={TOOLTIPS_CONF.scoreGlobal}
                />
                {textoNivel && (
                  <p style={{
                    margin: '4px 0 0', fontSize: 11, color: '#6b7280',
                    lineHeight: 1.5, borderTop: '1px solid #f3f4f6', paddingTop: 8,
                  }}>
                    {textoNivel}
                  </p>
                )}
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
          <>
            {/* Texto narrativo del momento actual */}
            <div style={{
              marginBottom: 10, padding: '6px 10px',
              background: '#1e1b4b', borderRadius: 6,
            }}>
              <span style={{ fontSize: 11, color: '#e0e7ff', fontFamily: 'monospace' }}>
                {narrativa}
              </span>
            </div>

            {/* Tabla con highlight del frame actual y auto-scroll */}
            <div>
              <Table
                dataSource={eventosVentana}
                columns={COLUMNAS_EVENTOS}
                rowKey={(_, i) => i}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
                rowClassName={(record) => {
                  const diff = record.tiempo - currentTime
                  return Math.abs(diff) <= TOLERANCIA_FRAME ? 'row-highlight-current' : ''
                }}
                onRow={(record) => {
                  const diff = record.tiempo - currentTime
                  const isCurrent = Math.abs(diff) <= TOLERANCIA_FRAME
                  const isPast = diff < -TOLERANCIA_FRAME
                  return {
                    style: {
                      background: isCurrent ? '#fef9c3' : undefined,
                      opacity: isPast ? 0.5 : diff > TOLERANCIA_FRAME ? 0.35 : 1,
                      transition: 'opacity 0.2s',
                    },
                  }
                }}
                locale={{
                  emptyText: 'No hay eventos en este momento. Avanza el reproductor para ver eventos.',
                }}
              />
            </div>
          </>
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

function ConfBar({ label, value, color, tooltip }) {
  const pct = value != null ? Math.round(value * 100) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltip && (
            <Tooltip title={tooltip} placement="right">
              <span style={{
                cursor: 'help',
                color: '#9ca3af',
                fontSize: 9,
                border: '1px solid #d1d5db',
                borderRadius: '50%',
                width: 13,
                height: 13,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                flexShrink: 0,
              }}>?</span>
            </Tooltip>
          )}
        </span>
        <b>{value != null ? `${pct}%` : '—'}</b>
      </div>
      <Progress percent={pct} strokeColor={color} showInfo={false} size="small" />
    </div>
  )
}
