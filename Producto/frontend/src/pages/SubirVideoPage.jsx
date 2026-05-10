import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axiosConfig'
import { usePolling } from '../hooks/usePolling'

const ESTADO_TEXTO = {
  PENDIENTE: 'En cola de procesamiento...',
  PROCESANDO: 'Analizando video...',
  FRAME_LISTO: 'Frame extraído. Redirigiendo...',
  COMPLETADO: 'Análisis completado.',
  ERROR: 'Ocurrió un error.',
}

export default function SubirVideoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [progreso, setProgreso] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [videoId, setVideoId] = useState(null)
  const [estadoVideo, setEstadoVideo] = useState(null)
  const [error, setError] = useState('')

  const pollingActivo = !!videoId && estadoVideo !== 'COMPLETADO' && estadoVideo !== 'ERROR' && estadoVideo !== 'FRAME_LISTO'

  async function consultarEstado() {
    if (!videoId) return
    try {
      const res = await api.get(`/videos/${videoId}/estado`)
      setEstadoVideo(res.data.estado)
      if (res.data.estado === 'FRAME_LISTO') {
        navigate(`/app/videos/${videoId}/zonas`, { replace: true })
      }
      if (res.data.estado === 'ERROR') {
        setError(res.data.mensaje_error || 'Error en el procesamiento del video')
      }
    } catch {
      setError('No se pudo consultar el estado del video')
    }
  }

  usePolling(consultarEstado, 3000, pollingActivo)

  function onSeleccionArchivo(e) {
    const f = e.target.files[0]
    if (f && f.type === 'video/mp4') {
      setArchivo(f)
      setError('')
    } else if (f) {
      setError('Solo se aceptan archivos MP4')
      setArchivo(null)
    }
  }

  async function subir() {
    if (!archivo) return
    setSubiendo(true)
    setError('')
    setProgreso(0)

    const form = new FormData()
    form.append('archivo', archivo)

    try {
      const res = await api.post(`/recintos/${id}/videos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1))
          setProgreso(pct)
        },
      })
      setVideoId(res.data.id)
      setEstadoVideo(res.data.estado || 'PENDIENTE')
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al subir el video')
      setSubiendo(false)
    }
  }

  const tamañoLegible = archivo
    ? archivo.size < 1024 * 1024
      ? `${(archivo.size / 1024).toFixed(1)} KB`
      : `${(archivo.size / (1024 * 1024)).toFixed(1)} MB`
    : ''

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to={`/app/recintos/${id}`} className="link">Recinto</Link> / Subir video
          </div>
          <h2>Analizar nuevo video</h2>
          <p className="text-muted">Sube un archivo MP4 para iniciar el análisis de flujo</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 540 }}>
        {!videoId ? (
          <>
            <div
              className="upload-area"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4"
                style={{ display: 'none' }}
                onChange={onSeleccionArchivo}
              />
              {archivo ? (
                <div className="upload-file-info">
                  <div className="upload-file-name">{archivo.name}</div>
                  <div className="upload-file-size">{tamañoLegible}</div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📁</div>
                  <div>Haz clic para seleccionar un archivo MP4</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>o arrastra y suelta aquí</div>
                </div>
              )}
            </div>

            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

            {archivo && !subiendo && (
              <button className="btn btn-primary btn-full" style={{ marginTop: 16 }} onClick={subir}>
                Subir y analizar
              </button>
            )}

            {subiendo && (
              <div style={{ marginTop: 16 }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progreso}%` }} />
                </div>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Subiendo... {progreso}%
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="upload-status">
            <div className="spinner" style={{ marginBottom: 16 }} />
            <div className="upload-status-text">
              {ESTADO_TEXTO[estadoVideo] || 'Procesando...'}
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
