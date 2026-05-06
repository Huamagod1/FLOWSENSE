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
| GET | `/{id}/frame-preview` | Obtiene datos para la previsualización de frames. | - |
| GET | `/{id}/frame-preview/imagen` | Sirve la imagen PNG del frame para previsualizar. | - |
| PUT | `/{id}/analisis` | Guarda zonas y dispara el proceso de análisis. | `GuardarZonasYProcesarRequest` |
| GET | `/{id}/resumen` | Obtiene los resultados finales y métricas del análisis. | - |

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
