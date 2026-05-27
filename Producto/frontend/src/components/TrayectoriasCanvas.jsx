import { useEffect, useRef, useState } from 'react'

const PRIMARY = '#7C3AED'

export default function TrayectoriasCanvas({ frameSrc, zones = [], metricas = [], flujoZonas = [], tracks = [] }) {
  const canvasRef    = useRef()
  const imgRef       = useRef()
  const containerRef = useRef()
  const [imgLoaded, setImgLoaded] = useState(false)

  function draw() {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || !img.naturalWidth) return

    // Usar naturalWidth como fallback cuando el tab está oculto (offsetWidth === 0)
    const w = img.offsetWidth  > 0 ? img.offsetWidth  : img.naturalWidth
    const h = img.offsetHeight > 0 ? img.offsetHeight : img.naturalHeight

    canvas.width  = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    // Overlay blanco suave para aclarar fondos oscuros
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(0, 0, w, h)

    const metricaMap = {}
    metricas.forEach(m => { metricaMap[m.idZona] = m })

    const zoneCenters = {}

    zones.forEach(z => {
      const x  = z.xNorm    * w
      const y  = z.yNorm    * h
      const zw = z.anchoNorm * w
      const zh = z.altoNorm  * h
      const cx = x + zw / 2
      const cy = y + zh / 2
      zoneCenters[z.id] = { x: cx, y: cy }

      const color = z.colorHex || PRIMARY
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      ctx.fillStyle   = `rgba(${r},${g},${b},0.18)`
      ctx.strokeStyle = color
      ctx.lineWidth   = 2
      ctx.fillRect(x, y, zw, zh)
      ctx.strokeRect(x, y, zw, zh)

      ctx.fillStyle = color
      ctx.font      = 'bold 12px sans-serif'
      ctx.fillText(z.nombre, x + 6, y + 16)

      const m  = metricaMap[z.id]
      const pu = m?.personasUnicas
      if (pu != null && pu > 0) {
        const radius = Math.min(22, Math.max(14, pu / 2))
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
        ctx.fill()
        ctx.fillStyle      = '#fff'
        ctx.font           = 'bold 11px sans-serif'
        ctx.textAlign      = 'center'
        ctx.textBaseline   = 'middle'
        ctx.fillText(pu, cx, cy)
        ctx.textAlign      = 'left'
        ctx.textBaseline   = 'alphabetic'
      }
    })

    if (flujoZonas.length > 0) {
      const maxConteo = Math.max(...flujoZonas.map(f => f.conteoTracks || 0))
      if (maxConteo > 0) {
        flujoZonas.forEach(f => {
          const from = zoneCenters[f.zonaOrigenId]
          const to   = zoneCenters[f.zonaDestinoId]
          if (!from || !to || f.zonaOrigenId === f.zonaDestinoId) return

          const lineWidth = Math.max(1, Math.round((f.conteoTracks / maxConteo) * 5))
          const dx  = to.x - from.x
          const dy  = to.y - from.y
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len === 0) return
          const ux        = dx / len
          const uy        = dy / len
          const arrowSize = 8

          ctx.beginPath()
          ctx.moveTo(from.x, from.y)
          ctx.lineTo(to.x, to.y)
          ctx.strokeStyle = 'rgba(255,255,255,0.75)'
          ctx.lineWidth   = lineWidth
          ctx.setLineDash([])
          ctx.stroke()

          const ax = to.x - ux * arrowSize
          const ay = to.y - uy * arrowSize
          ctx.beginPath()
          ctx.moveTo(to.x, to.y)
          ctx.lineTo(ax - uy * arrowSize * 0.5, ay + ux * arrowSize * 0.5)
          ctx.lineTo(ax + uy * arrowSize * 0.5, ay - ux * arrowSize * 0.5)
          ctx.closePath()
          ctx.fillStyle = 'rgba(255,255,255,0.75)'
          ctx.fill()
        })
      }
    }

    // Trayectorias individuales: arcos bezier entre zona inicio y zona fin por track
    const tracksMovimiento = tracks.filter(t =>
      t.zonaInicioId && t.zonaFinId &&
      t.zonaInicioId !== t.zonaFinId &&
      (t.framesTotal || 0) >= 2
    )
    const MAX_TRACKS = 30
    const tracksAMostrar = tracksMovimiento.slice(0, MAX_TRACKS)

    if (tracksAMostrar.length > 0) {
      const palette = ['#f97316','#06b6d4','#10b981','#a855f7','#f43f5e','#eab308','#3b82f6','#84cc16','#f472b6','#22d3ee']
      tracksAMostrar.forEach((t, i) => {
        const from = zoneCenters[t.zonaInicioId]
        const to   = zoneCenters[t.zonaFinId]
        if (!from || !to) return
        const color = palette[i % palette.length]
        const n     = tracksAMostrar.length
        const ratio = n > 1 ? (i / (n - 1) - 0.5) : 0
        const dx    = to.x - from.x
        const dy    = to.y - from.y
        const len   = Math.sqrt(dx * dx + dy * dy) || 1
        const curva = ratio * Math.min(len * 0.4, 50)
        const cpx   = (from.x + to.x) / 2 - (dy / len) * curva
        const cpy   = (from.y + to.y) / 2 + (dx / len) * curva

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(cpx, cpy, to.x, to.y)
        ctx.strokeStyle = color + '77'
        ctx.lineWidth   = 1.5
        ctx.setLineDash([5, 4])
        ctx.stroke()
        ctx.setLineDash([])
      })
    }
  }

  useEffect(() => {
    if (imgLoaded) draw()
  }, [imgLoaded, zones, metricas, flujoZonas, tracks])

  // Redibujar cuando el tab se vuelve visible (ResizeObserver detecta cambio de 0 a dimensiones reales)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      if (imgLoaded && imgRef.current?.naturalWidth) draw()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [imgLoaded, zones, metricas, flujoZonas, tracks])

  const tracksConMovimiento = tracks.filter(t =>
    t.zonaInicioId && t.zonaFinId &&
    t.zonaInicioId !== t.zonaFinId &&
    (t.framesTotal || 0) >= 2
  )
  const tracksInsuficientes = tracks.length > 0 && tracks.every(t => (t.framesTotal || 0) < 2)

  if (!frameSrc) {
    return (
      <div style={{ width: '100%', paddingBottom: '56.25%', background: '#1f2028', borderRadius: 8, position: 'relative' }}>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
          Sin imagen de frame disponible
        </span>
      </div>
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 800, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e4e7' }}
      >
        <img
          ref={imgRef}
          src={frameSrc}
          alt="Trayectorias de personas"
          style={{ width: '100%', display: 'block', opacity: 0.55 }}
          onLoad={() => setImgLoaded(true)}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
      </div>
      {zones.length === 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af' }}>
          Sin datos de zonas para visualizar.
        </p>
      )}
      {flujoZonas.length === 0 && zones.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af' }}>
          No se detectaron movimientos entre zonas. Las burbujas muestran personas únicas por zona.
        </p>
      )}
      {tracksConMovimiento.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
          Las líneas punteadas muestran trayectorias individuales entre zonas ({tracksConMovimiento.length} personas con movimiento entre zonas).
        </p>
      )}
      {tracksInsuficientes && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#d97706' }}>
          Este análisis no tiene trayectorias suficientes para visualizar. Las trayectorias requieren al menos 2 puntos de detección por persona. Considera aumentar el fps del análisis para mejor tracking.
        </p>
      )}
    </div>
  )
}
