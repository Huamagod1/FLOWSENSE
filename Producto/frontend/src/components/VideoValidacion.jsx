import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, Progress, Button, Spin, Tooltip } from 'antd'
import { fetchOverlayBlobUrl, getEventos, eliminarVideoOriginal } from '../api/validacion'

const VENTANA_PANEL    = 1.0   // ±1s para el panel de eventos
const TOLERANCIA_FRAME = 0.8   // ±0.8s para estadísticas del frame actual

const TOOLTIPS_STATS = {
  detectadasAhora: 'Cuántas personas el sistema detecta en este instante del video',
  trackeadasAhora: 'Cuántas personas únicas están siendo seguidas en este momento. Puede ser menor que las detectadas si el sistema está identificando nuevas personas',
  personasUnicas:  'Cantidad total de personas distintas que pasaron durante todo el video. Cada persona se cuenta una sola vez',
  deteccionesTot:  'Cantidad de veces que el sistema vio personas durante todo el video. Una persona genera múltiples detecciones porque aparece en muchos frames',
}

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

function fmtTime(t) {
  const mm = Math.floor(t / 60).toString().padStart(2, '0')
  const ss = Math.floor(t % 60).toString().padStart(2, '0')
  return `${mm}:${ss}`
}

/**
 * Props:
 *   videoId       — id del video
 *   confiabilidad — objeto ConfiabilidadResponse del backend (puede ser null para videos legacy)
 */
export default function VideoValidacion({ videoId, confiabilidad }) {
  const [overlaySrc, setOverlaySrc]         = useState(null)
  const [overlayLoading, setOverlayLoading] = useState(true)
  const [overlayError, setOverlayError]     = useState(false)
  const [eventos, setEventos]               = useState([])
  const [eventosTruncados, setEventosTruncados] = useState(false)
  const [currentTime, setCurrentTime]       = useState(0)
  const [videoDuration, setVideoDuration]   = useState(0)
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
      .then(r => {
        const ev = r.data?.eventos || []
        setEventos(ev)
        if (r.data?.total != null && ev.length < r.data.total) {
          setEventosTruncados(true)
        }
      })
      .catch(() => {})
  }, [videoId])

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) setVideoDuration(videoRef.current.duration || 0)
  }

  // El overlay se codifica a min(fps_original, 24) fps, mientras que e.tiempo usa fps_original.
  // Si fps_original > 24, el overlay dura más que el original y currentTime != e.tiempo.
  // Corrección: originalTime = currentTime × duracionOriginalSeg / videoDuration
  const originalTime = useMemo(() => {
    const dur = confiabilidad?.duracionOriginalSeg
    if (videoDuration > 0 && dur > 0) return currentTime * dur / videoDuration
    return currentTime
  }, [currentTime, videoDuration, confiabilidad?.duracionOriginalSeg])

  // ── Mapeo track_id real → etiqueta secuencial (P1, P2...) ────────────────
  const trackLabelMap = useMemo(() => {
    const firstTime = {}
    eventos.forEach(e => {
      if (e.trackId >= 0 && (!(e.trackId in firstTime) || e.tiempo < firstTime[e.trackId])) {
        firstTime[e.trackId] = e.tiempo
      }
    })
    const sorted = Object.entries(firstTime).sort(([, a], [, b]) => a - b)
    return Object.fromEntries(sorted.map(([id], i) => [Number(id), `P${i + 1}`]))
  }, [eventos])

  // ── Eventos en ventana ±VENTANA_PANEL del tiempo actual ──────────────────
  const eventosPanel = useMemo(
    () => eventos.filter(e => Math.abs(e.tiempo - originalTime) <= VENTANA_PANEL),
    [eventos, originalTime],
  )

  // ── Eventos en el frame actual (±TOLERANCIA_FRAME) ───────────────────────
  const eventosCurrent = useMemo(
    () => eventosPanel.filter(e => Math.abs(e.tiempo - originalTime) <= TOLERANCIA_FRAME),
    [eventosPanel, originalTime],
  )

  // ── Estadísticas del frame actual (datos reales del instante) ─────────────
  const statsFrame = useMemo(() => ({
    detecciones: eventosCurrent.length,
    tracks:      new Set(eventosCurrent.map(e => e.trackId)).size,
  }), [eventosCurrent])

  // ── Acumulado sobre todos los eventos del análisis ────────────────────────
  const statsAcum = useMemo(() => ({
    personasUnicas:    new Set(eventos.filter(e => e.tipo === 'ENTRADA').map(e => e.trackId)).size,
    totalDetecciones:  eventos.length,
  }), [eventos])

  // ── Líneas compactas para el panel de eventos (±1s) ──────────────────────
  const lineasPanel = useMemo(() => {
    const lines = []

    // 1. Entradas y salidas individuales con timestamp
    eventosPanel
      .filter(e => e.tipo === 'ENTRADA' || e.tipo === 'SALIDA')
      .forEach(e => {
        const pid   = trackLabelMap[e.trackId] ?? `#${e.trackId}`
        const verbo = e.tipo === 'ENTRADA' ? 'entró a' : 'salió de'
        lines.push({ tipo: e.tipo, text: `[${fmtTime(e.tiempo)}] ${pid} ${verbo} Zona ${e.zonaId}` })
      })

    // 2. Detecciones agrupadas por zona
    const byZona = {}
    eventosPanel
      .filter(e => e.tipo === 'DETECCION')
      .forEach(e => {
        if (!byZona[e.zonaId]) byZona[e.zonaId] = new Set()
        byZona[e.zonaId].add(e.trackId)
      })
    Object.entries(byZona).forEach(([zonaId, tids]) => {
      const n = tids.size
      lines.push({
        tipo: 'DETECCION',
        text: `${n} persona${n !== 1 ? 's' : ''} trackeada${n !== 1 ? 's' : ''} en Zona ${zonaId}`,
      })
    })

    return lines
  }, [eventosPanel, trackLabelMap])

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

  const colorConf  = NIVEL_COLOR[confiabilidad?.nivelConfiabilidad] || '#9ca3af'
  const textoNivel = TEXTOS_NIVEL[confiabilidad?.nivelConfiabilidad]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Narrativa explicativa */}
      <Card style={{ marginBottom: 16, background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: '#374151' }}>
          <b>¿Cómo funciona esta vista?</b> El video procesado muestra las detecciones y
          trayectorias de cada persona detectada. Usa los controles del reproductor para
          revisar momentos específicos. El panel de eventos muestra las entradas, salidas
          y detecciones dentro del ±1 segundo actual. Verifica visualmente que el modelo
          cuenta correctamente <b>antes</b> de confiar en los precios sugeridos.
        </p>
      </Card>

      {eventosTruncados && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 6,
          background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12, color: '#92400e',
        }}>
          Aviso: el volumen de eventos de este video supera el limite de carga. El panel de eventos puede mostrar datos incompletos en segundos del final del video. Las metricas globales en las otras tabs no se ven afectadas.
        </div>
      )}

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
              onLoadedMetadata={handleLoadedMetadata}
              style={{ width: '100%', display: 'block', maxHeight: 500 }}
            />
          )}
        </div>

        {/* ── Panel de estadísticas ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Frame actual */}
          <Card size="small" title={
            <span style={{ fontSize: 12, color: '#374151' }}>
              Frame actual ({fmtTime(currentTime)})
            </span>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox
                value={statsFrame.detecciones}
                label="Detectadas ahora"
                color="#7C3AED"
                bg="#f5f3ff"
                tooltip={TOOLTIPS_STATS.detectadasAhora}
              />
              <StatBox
                value={statsFrame.tracks}
                label="Trackeadas"
                color="#7C3AED"
                bg="#f5f3ff"
                tooltip={TOOLTIPS_STATS.trackeadasAhora}
              />
            </div>
          </Card>

          {/* Total análisis */}
          <Card size="small" title={
            <span style={{ fontSize: 12, color: '#374151' }}>
              Total del análisis
            </span>
          }>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox
                value={statsAcum.personasUnicas}
                label="Personas únicas"
                color="#16a34a"
                bg="#f0fdf4"
                tooltip={TOOLTIPS_STATS.personasUnicas}
              />
              <StatBox
                value={statsAcum.totalDetecciones}
                label="Detecciones"
                color="#2563eb"
                bg="#eff6ff"
                tooltip={TOOLTIPS_STATS.deteccionesTot}
              />
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

      {/* ── Panel de eventos recientes ─────────────────────────────────────── */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <span style={{ fontSize: 13 }}>
            Eventos recientes
            {' '}
            <span style={{ color: '#6b7280', fontWeight: 400 }}>
              (±1s · t={fmtTime(currentTime)})
            </span>
          </span>
        }
      >
        {eventos.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '12px 0', margin: 0 }}>
            No hay datos de eventos para este análisis.
          </p>
        ) : (
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {lineasPanel.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                Sin eventos en este momento
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lineasPanel.map((line, i) => (
                  <div key={i} style={{
                    fontSize: 12,
                    color: line.tipo === 'ENTRADA' ? '#16a34a'
                         : line.tipo === 'SALIDA'  ? '#dc2626'
                         : '#6b7280',
                    lineHeight: 1.5,
                  }}>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
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

function StatBox({ value, label, color, bg, tooltip }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 6px', background: bg, borderRadius: 6 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{
        fontSize: 10, color: '#6b7280', marginTop: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
      }}>
        {label}
        {tooltip && (
          <Tooltip title={tooltip} placement="bottom">
            <span style={{
              cursor: 'help', color: '#9ca3af', fontSize: 9,
              border: '1px solid #d1d5db', borderRadius: '50%',
              width: 12, height: 12, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0,
            }}>?</span>
          </Tooltip>
        )}
      </div>
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
                cursor: 'help', color: '#9ca3af', fontSize: 9,
                border: '1px solid #d1d5db', borderRadius: '50%',
                width: 13, height: 13, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0,
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
