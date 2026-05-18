import { useEffect, useRef } from 'react'

const PRIMARY = '#7C3AED'

export default function TrayectoriasCanvas({ frameSrc, zones = [], metricas = [], flujoZonas = [] }) {
  const canvasRef = useRef()
  const imgRef = useRef()

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.naturalWidth) return

    const w = img.offsetWidth
    const h = img.offsetHeight
    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)

    const metricaMap = {}
    metricas.forEach(m => { metricaMap[m.idZona] = m })

    const zoneCenters = {}

    zones.forEach(z => {
      const x = z.xNorm * w
      const y = z.yNorm * h
      const zw = z.anchoNorm * w
      const zh = z.altoNorm * h
      const cx = x + zw / 2
      const cy = y + zh / 2
      zoneCenters[z.id] = { x: cx, y: cy }

      const color = z.colorHex || PRIMARY
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      ctx.fillStyle = `rgba(${r},${g},${b},0.18)`
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.fillRect(x, y, zw, zh)
      ctx.strokeRect(x, y, zw, zh)

      ctx.fillStyle = color
      ctx.font = 'bold 12px sans-serif'
      ctx.fillText(z.nombre, x + 6, y + 16)

      const m = metricaMap[z.id]
      const pu = m?.personasUnicas
      if (pu != null && pu > 0) {
        const radius = Math.min(22, Math.max(14, pu / 2))
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(pu, cx, cy)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
      }
    })

    if (flujoZonas.length > 0) {
      const maxConteo = Math.max(...flujoZonas.map(f => f.conteoTracks || 0))
      flujoZonas.forEach(f => {
        const from = zoneCenters[f.zonaOrigenId]
        const to = zoneCenters[f.zonaDestinoId]
        if (!from || !to || f.zonaOrigenId === f.zonaDestinoId) return

        const lineWidth = Math.max(1, Math.round((f.conteoTracks / maxConteo) * 5))
        const dx = to.x - from.x
        const dy = to.y - from.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) return
        const ux = dx / len
        const uy = dy / len
        const arrowSize = 8

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'
        ctx.lineWidth = lineWidth
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

  useEffect(() => {
    if (frameSrc && imgRef.current?.complete) draw()
  }, [zones, metricas, flujoZonas, frameSrc])

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
    <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 800, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e4e7' }}>
      <img
        ref={imgRef}
        src={frameSrc}
        alt="Trayectorias de personas"
        style={{ width: '100%', display: 'block' }}
        onLoad={draw}
      />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  )
}
