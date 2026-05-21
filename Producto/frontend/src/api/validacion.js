import api from './axiosConfig'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const getConfiabilidad = (videoId) =>
  api.get(`/videos/${videoId}/confiabilidad`)

export const getEventos = (videoId, desde, hasta) =>
  api.get(`/videos/${videoId}/eventos`, { params: { desde, hasta } })

export const eliminarVideoOriginal = (videoId) =>
  api.delete(`/videos/${videoId}/video-original`)

/** Descarga el overlay como blob URL autenticado. Devuelve la URL (string). */
export async function fetchOverlayBlobUrl(videoId) {
  const token = localStorage.getItem('flowsense_token')
  const res = await fetch(`${BASE_URL}/videos/${videoId}/video-overlay`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
