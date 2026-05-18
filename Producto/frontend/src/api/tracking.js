import api from './axiosConfig'

export const getTracks = (videoId) => api.get(`/videos/${videoId}/tracks`)
export const getFlujoZonas = (videoId) => api.get(`/videos/${videoId}/flujo-zonas`)
export const getMetricasTracking = (videoId) => api.get(`/videos/${videoId}/metricas-tracking`)
