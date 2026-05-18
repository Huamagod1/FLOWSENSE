const PRIMARY = '#7C3AED'

function getZoneName(id, zones) {
  return zones.find(z => z.id === id)?.nombre || `Zona ${id}`
}

function getZoneColor(id, zones) {
  return zones.find(z => z.id === id)?.colorHex || PRIMARY
}

export default function FlujoSankeyChart({ flujoZonas = [], zones = [] }) {
  if (!flujoZonas.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
        Sin datos de flujo entre zonas. Se requiere video con tracking activo.
      </div>
    )
  }

  const sorted = [...flujoZonas].sort((a, b) => (b.conteoTracks || 0) - (a.conteoTracks || 0))
  const maxConteo = Math.max(...sorted.map(f => f.conteoTracks || 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sorted.map((f, i) => {
        const pct = maxConteo > 0 ? (f.conteoTracks / maxConteo) * 100 : 0
        const colorOrigen = getZoneColor(f.zonaOrigenId, zones)
        const colorDestino = getZoneColor(f.zonaDestinoId, zones)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 110, textAlign: 'right', fontSize: 13, fontWeight: 600,
              color: colorOrigen, flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {getZoneName(f.zonaOrigenId, zones)}
            </div>

            <div style={{ flex: 1, position: 'relative', height: 28 }}>
              <div style={{
                height: '100%',
                borderRadius: 4,
                background: `linear-gradient(to right, ${colorOrigen}99, ${colorDestino}99)`,
                width: `${Math.max(pct, 4)}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                transition: 'width 0.3s',
                minWidth: 28,
              }}>
                {f.conteoTracks}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <path d="M4 10h12M12 5l5 5-5 5" stroke={colorDestino} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{
                width: 100, fontSize: 13, fontWeight: 600, color: colorDestino,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {getZoneName(f.zonaDestinoId, zones)}
              </span>
            </div>
          </div>
        )
      })}
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
        El ancho de cada barra es proporcional al número de trayectorias registradas entre las zonas.
      </p>
    </div>
  )
}
