# FlowSense API - Endpoints Reference

## Base URL
`http://localhost:8080` (Default)
All API endpoints are prefixed with `/api`.

## Authentication (`/api/auth`)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/registro` | Registra una nueva organización y un usuario administrador. | `RegistroRequest` |
| POST | `/login` | Autentica a un usuario y retorna un token JWT. | `LoginRequest` |

### `RegistroRequest`
```json
{
  "nombreOrganizacion": "string",
  "email": "usuario@ejemplo.com",
  "password": "Password123",
  "nombre": "Juan",
  "apellido": "Pérez"
}
```

---

## Recintos (`/api/recintos`)
*Requiere Autenticación*

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/` | Lista todos los recintos de la organización actual. | - |
| POST | `/` | Crea un nuevo recinto. | `RecintoRequest` |
| GET | `/{id}` | Obtiene los detalles de un recinto específico. | - |
| PUT | `/{id}` | Actualiza un recinto existente. | `RecintoRequest` |
| DELETE | `/{id}` | Desactiva un recinto (borrado lógico). | - |

### `RecintoRequest`
```json
{
  "nombre": "string",
  "direccion": "string",
  "descripcion": "string",
  "precioBaseClp": 15000
}
```

---

## Zonas (`/api/recintos/{idRecinto}/zonas`)
*Requiere Autenticación*

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/` | Lista todas las zonas definidas para un recinto. | - |
| PUT | `/` | Guarda/Actualiza la lista de zonas de un recinto. | `ZonasGuardarRequest` |

### `ZonaRequest` (Usado en listas)
```json
{
  "nombre": "Pasillo A",
  "colorHex": "#FF0000",
  "xNorm": 0.1,
  "yNorm": 0.1,
  "anchoNorm": 0.2,
  "altoNorm": 0.2,
  "orden": 1
}
```

---

## Videos (`/api/recintos/{idRecinto}/videos`)
*Requiere Autenticación*

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/` | Sube un video para su procesamiento. | `multipart/form-data` (key: `archivo`) |
| GET | `/` | Lista los videos asociados a un recinto. | - |

---

## Consultas de Video y Análisis (`/api/videos`)
*Requiere Autenticación*

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/{id}` | Obtiene información general y estado de un video. | - |
| GET | `/{id}/estado` | Polling del estado de procesamiento del video. | - |
| GET | `/{id}/frame-preview` | Obtiene metadatos del frame preview (ruta, dimensiones). | - |
| GET | `/{id}/frame-preview/imagen` | Sirve la imagen PNG del frame para previsualizar. | - |
| PUT | `/{id}/analisis` | Guarda zonas y dispara el proceso de análisis. | `GuardarZonasYProcesarRequest` |
| GET | `/{id}/resumen` | Obtiene los resultados finales y métricas del análisis. | - |
| GET | `/{id}/metricas` | Métricas calculadas por zona (4 métricas clásicas). | - |
| GET | `/{id}/metricas-temporales` | Métricas por franja temporal. | - |
| GET | `/{id}/detecciones` | Puntos para heatmap (coordenadas anónimas). | - |
| POST | `/{id}/precio-sugerido` | Calcula precios sugeridos dado un precio base. | `PrecioSugeridoRequest` |
| GET | `/{id}/zonas` | Lista las zonas definidas para el video. | - |
| PUT | `/{id}/zonas` | Guarda/actualiza zonas en batch. | `List<ZonaRequest>` |
| POST | `/{id}/zonas/confirmar` | Confirma zonas y lanza el análisis. | - |
| DELETE | `/{id}` | Elimina el video y todos sus datos asociados. | - |

### Endpoints de Tracking (`/api/videos`)
*Requiere Autenticación — disponibles solo cuando estado=COMPLETADO*

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/{id}/tracks` | Lista tracks individuales (ByteTrack): zona inicio/fin, frames, duración. | - |
| GET | `/{id}/flujo-zonas` | Flujo agregado entre pares de zonas (origen → destino, conteo). | - |
| GET | `/{id}/metricas-tracking` | 8 métricas de tracking por zona (personas únicas, permanencia, etc.). | - |

### Endpoints de Validación (`/api/videos`)
*Requiere Autenticación — disponibles solo cuando estado=COMPLETADO*

| Method | Endpoint | Description | Parámetros |
|--------|----------|-------------|------------|
| GET | `/{id}/confiabilidad` | Score de confiabilidad del análisis (ALTO/MEDIO/BAJO) con detalles de confianza promedio, calidad de tracking y % frames OK. | - |
| GET | `/{id}/video-overlay` | Stream MP4 del video original con trayectorias de tracking superpuestas (H.264, acceso solo del dueño). | - |
| GET | `/{id}/eventos` | Eventos de entrada/salida por zona en el tiempo, paginado por ventana de frames. | `?desde=0&hasta=900` |
| DELETE | `/{id}/video-original` | Elimina el MP4 original del servidor (libera espacio). Las métricas y el overlay NO se eliminan. | - |

### `GuardarZonasYProcesarRequest`
```json
{
  "zonas": [
    {
      "nombre": "Zona 1",
      "colorHex": "#FF0000",
      "xNorm": 0.1,
      "yNorm": 0.1,
      "anchoNorm": 0.5,
      "altoNorm": 0.5,
      "orden": 0
    }
  ]
}
```

### `PrecioSugeridoRequest`
```json
{
  "precioBase": 150000
}
```

### Respuesta `ConfiabilidadResponse`
```json
{
  "nivelConfiabilidad": "ALTO",
  "confianzaPromedio": 0.81,
  "calidadTracking": 0.76,
  "porcentajeFramesOk": 0.97,
  "totalFramesProcesados": 897,
  "totalDetecciones": 2341,
  "personasUnicas": 47
}
```
