import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Text } from 'react-konva'
import { Button, Input, ColorPicker, message } from 'antd'
import api from '../api/axiosConfig'

const COLORES_DEFAULT = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

function ZonaRect({ zona, isSelected, onSelect, onChange }) {
  const rectRef = useRef()
  const trRef = useRef()

  useEffect(() => {
    if (isSelected && trRef.current && rectRef.current) {
      trRef.current.nodes([rectRef.current])
      trRef.current.getLayer().batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Rect
        ref={rectRef}
        x={zona.x}
        y={zona.y}
        width={zona.width}
        height={zona.height}
        fill={zona.color + '40'}
        stroke={zona.color}
        strokeWidth={2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={e => onChange({ x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = rectRef.current
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
          })
        }}
      />
      <Text
        x={zona.x + 4}
        y={zona.y + 4}
        text={zona.nombre}
        fill={zona.color}
        fontSize={12}
        fontStyle="bold"
        listening={false}
      />
      {isSelected && <Transformer ref={trRef} boundBoxFunc={(_, newBox) => ({
        ...newBox,
        width: Math.max(20, newBox.width),
        height: Math.max(20, newBox.height),
      })} />}
    </>
  )
}

export default function EditorZonasPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [frameInfo, setFrameInfo] = useState(null)
  const [frameImg, setFrameImg] = useState(null)
  const [zonas, setZonas] = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [dibujando, setDibujando] = useState(false)
  const [nuevaZona, setNuevaZona] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const stageRef = useRef()
  const contadorRef = useRef(1)

  useEffect(() => {
    api.get(`/videos/${id}/frame-preview`)
      .then(res => setFrameInfo(res.data))
      .catch(() => setError('No se pudo cargar el frame del video'))

    api.get(`/videos/${id}/zonas`).then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        const anchoCv = 800
        const altoCv = 450
        setZonas(res.data.map((z, i) => ({
          id: Date.now() + i,
          nombre: z.nombre,
          color: z.colorHex || COLORES_DEFAULT[i % COLORES_DEFAULT.length],
          x: z.xNorm * anchoCv,
          y: z.yNorm * altoCv,
          width: z.anchoNorm * anchoCv,
          height: z.altoNorm * altoCv,
        })))
        contadorRef.current = res.data.length + 1
      }
    }).catch(() => {})
  }, [id])

  useEffect(() => {
    let objectUrl = null
    api.get(`/videos/${id}/frame-preview/imagen`, { responseType: 'blob' })
      .then(res => {
        objectUrl = URL.createObjectURL(res.data)
        const img = new window.Image()
        img.onload = () => setFrameImg(img)
        img.onerror = () => setError('No se pudo cargar la imagen del frame')
        img.src = objectUrl
      })
      .catch(() => setError('No se pudo cargar la imagen del frame'))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [id])

  const CANVAS_W = 800
  const CANVAS_H = 450

  function getPos() {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const pos = stage.getPointerPosition()
    return pos || { x: 0, y: 0 }
  }

  function onMouseDown(e) {
    if (e.target !== e.target.getStage() && e.target.className !== 'Image') return
    setSeleccionada(null)
    const pos = getPos()
    setDibujando(true)
    setNuevaZona({ x: pos.x, y: pos.y, width: 0, height: 0 })
  }

  function onMouseMove() {
    if (!dibujando || !nuevaZona) return
    const pos = getPos()
    setNuevaZona(z => ({ ...z, width: pos.x - z.x, height: pos.y - z.y }))
  }

  function onMouseUp() {
    if (!dibujando || !nuevaZona) return
    setDibujando(false)
    const w = Math.abs(nuevaZona.width)
    const h = Math.abs(nuevaZona.height)
    if (w > 10 && h > 10) {
      const colorIdx = zonas.length % COLORES_DEFAULT.length
      const zona = {
        id: Date.now(),
        nombre: `Zona ${contadorRef.current++}`,
        color: COLORES_DEFAULT[colorIdx],
        x: nuevaZona.width < 0 ? nuevaZona.x + nuevaZona.width : nuevaZona.x,
        y: nuevaZona.height < 0 ? nuevaZona.y + nuevaZona.height : nuevaZona.y,
        width: w,
        height: h,
      }
      setZonas(z => [...z, zona])
      setSeleccionada(zona.id)
    }
    setNuevaZona(null)
  }

  function actualizarZona(zId, cambios) {
    setZonas(z => z.map(z2 => z2.id === zId ? { ...z2, ...cambios } : z2))
  }

  function eliminarZona(zId) {
    setZonas(z => z.filter(z2 => z2.id !== zId))
    if (seleccionada === zId) setSeleccionada(null)
  }

  async function guardarYConfirmar() {
    if (zonas.length === 0) {
      message.warning('Debes definir al menos una zona antes de continuar')
      return
    }
    setGuardando(true)
    setError('')
    const payload = zonas.map(z => ({
      nombre: z.nombre,
      colorHex: z.color,
      xNorm: z.x / CANVAS_W,
      yNorm: z.y / CANVAS_H,
      anchoNorm: z.width / CANVAS_W,
      altoNorm: z.height / CANVAS_H,
    }))
    try {
      await api.put(`/videos/${id}/zonas`, payload)
      await api.post(`/videos/${id}/zonas/confirmar`)
      navigate(`/app/analisis/${id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al guardar las zonas')
      setGuardando(false)
    }
  }

  async function soloGuardar() {
    if (zonas.length === 0) {
      message.warning('Debes definir al menos una zona')
      return
    }
    setGuardando(true)
    const payload = zonas.map(z => ({
      nombre: z.nombre,
      colorHex: z.color,
      xNorm: z.x / CANVAS_W,
      yNorm: z.y / CANVAS_H,
      anchoNorm: z.width / CANVAS_W,
      altoNorm: z.height / CANVAS_H,
    }))
    try {
      await api.put(`/videos/${id}/zonas`, payload)
      message.success('Zonas guardadas')
    } catch {
      setError('Error al guardar las zonas')
    } finally {
      setGuardando(false)
    }
  }

  const zonaSeleccionada = zonas.find(z => z.id === seleccionada)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/app/recintos" className="link">Recintos</Link> / Editor de zonas
          </div>
          <h2>Definir zonas de análisis</h2>
          <p className="text-muted">Dibuja rectángulos sobre el frame para definir las zonas a analizar</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="editor-layout">
        <div className="editor-canvas-wrap">
          <Stage
            ref={stageRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            style={{ border: '1px solid #e5e4e7', cursor: 'crosshair', borderRadius: 4 }}
          >
            <Layer>
              {frameImg && (
                <KonvaImage image={frameImg} width={CANVAS_W} height={CANVAS_H} />
              )}
              {!frameImg && (
                <Rect width={CANVAS_W} height={CANVAS_H} fill="#1f2028" />
              )}
              {zonas.map(z => (
                <ZonaRect
                  key={z.id}
                  zona={z}
                  isSelected={seleccionada === z.id}
                  onSelect={() => setSeleccionada(z.id)}
                  onChange={cambios => actualizarZona(z.id, cambios)}
                />
              ))}
              {dibujando && nuevaZona && (
                <Rect
                  x={nuevaZona.x}
                  y={nuevaZona.y}
                  width={nuevaZona.width}
                  height={nuevaZona.height}
                  fill="rgba(170,59,255,0.2)"
                  stroke="#aa3bff"
                  strokeWidth={2}
                  listening={false}
                />
              )}
            </Layer>
          </Stage>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Haz clic y arrastra para crear zonas. Selecciona una zona para editarla.
          </p>
        </div>

        <div className="editor-sidebar">
          <h4 style={{ margin: '0 0 12px' }}>Zonas definidas ({zonas.length})</h4>

          {zonas.length === 0 && (
            <p className="text-muted" style={{ fontSize: 13 }}>Aún no hay zonas. Dibuja rectángulos en el canvas.</p>
          )}

          <div className="zona-list">
            {zonas.map(z => (
              <div
                key={z.id}
                className={`zona-item${z.id === seleccionada ? ' active' : ''}`}
                onClick={() => setSeleccionada(z.id)}
              >
                <div className="zona-color" style={{ background: z.color }} />
                <div className="zona-nombre">{z.nombre}</div>
                <button
                  className="zona-delete"
                  onClick={e => { e.stopPropagation(); eliminarZona(z.id) }}
                  title="Eliminar zona"
                >×</button>
              </div>
            ))}
          </div>

          {zonaSeleccionada && (
            <div className="zona-editor-panel">
              <div className="field">
                <label className="field-label">Nombre de zona</label>
                <Input
                  value={zonaSeleccionada.nombre}
                  onChange={e => actualizarZona(zonaSeleccionada.id, { nombre: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="field-label">Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORES_DEFAULT.map(c => (
                    <button
                      key={c}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: c,
                        border: c === zonaSeleccionada.color ? '2px solid #000' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => actualizarZona(zonaSeleccionada.id, { color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="editor-actions">
            <Button onClick={soloGuardar} disabled={guardando} style={{ width: '100%', marginBottom: 8 }}>
              Guardar zonas
            </Button>
            <Button
              type="primary"
              onClick={guardarYConfirmar}
              disabled={guardando || zonas.length === 0}
              style={{ width: '100%' }}
            >
              {guardando ? 'Procesando...' : 'Confirmar y analizar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
