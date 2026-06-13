# CLAUDE.md — Capa Backend / Spring Boot

Este archivo da contexto específico de la API REST de FlowSense. Complementa el `CLAUDE.md` raíz.

## Rol del módulo

API REST en Spring Boot 3 que orquesta el sistema completo. Recibe requests de React, gestiona autenticación con JWT, invoca Python para procesamiento de video, lee CSV resultantes, calcula métricas avanzadas y persiste todo en MySQL.

## Stack del módulo

- Spring Boot 3.2+
- Java 21 (LTS)
- Spring Security + JWT (jjwt 0.12.x)
- Spring Data JPA
- Spring Validation
- Spring Mail (post-MVP)
- MySQL Connector/J 8.x
- Maven como build tool
- Flyway para migraciones de BD

## Arquitectura de paquetes

```
src/main/java/cl/duoc/flowsense/
├── FlowsenseApplication.java
├── config/
│   ├── SecurityConfig.java
│   ├── JwtConfig.java
│   └── CorsConfig.java
├── auth/
│   ├── AuthController.java          ← /api/auth/**
│   ├── AuthService.java
│   ├── JwtService.java
│   ├── JwtAuthFilter.java
│   └── dto/
├── usuarios/
│   ├── Usuario.java                 ← entidad JPA
│   ├── UsuarioRepository.java
│   ├── UsuarioService.java
│   └── UsuarioController.java
├── recintos/
│   ├── Recinto.java
│   ├── RecintoRepository.java
│   ├── RecintoService.java
│   └── RecintoController.java
├── videos/
│   ├── Video.java
│   ├── VideoRepository.java
│   ├── VideoService.java
│   ├── VideoController.java
│   └── EstadoVideo.java             ← enum de estados
├── zonas/
│   ├── Zona.java
│   ├── ZonaRepository.java
│   ├── ZonaService.java
│   └── ZonaController.java
├── deteccion/
│   ├── Deteccion.java
│   ├── DeteccionRepository.java
│   └── CsvImportService.java        ← lee CSV de Python
├── metricas/
│   ├── MetricaZona.java
│   ├── MetricaTemporal.java
│   ├── MetricaRepository.java
│   ├── MetricaController.java
│   └── CalculadoraMetricasService.java
├── procesamiento/
│   ├── PipelineService.java         ← orquestación general
│   ├── PythonExecutor.java          ← ProcessBuilder wrapper
│   └── EstadoVideoListener.java     ← maneja transiciones de estado
└── common/
    ├── exceptions/
    ├── security/
    └── validation/
```

## Estados del Video (críticos)

```
PENDIENTE → FRAME_LISTO → ESPERANDO_ZONAS → PROCESANDO → COMPLETADO | ERROR
```

| Estado | Significado | Próximo paso |
|--------|-------------|--------------|
| PENDIENTE | Video subido, sin procesar | Lanzar extracción de frame |
| FRAME_LISTO | Frame extraído, listo para definir zonas | Frontend muestra editor |
| ESPERANDO_ZONAS | Admin está dibujando zonas | Esperar confirmación |
| PROCESANDO | Detección en curso | Polling cada 3 seg |
| COMPLETADO | Métricas calculadas | Mostrar dashboard |
| ERROR | Falló algún paso | Mostrar mensaje, permitir reintento |

## Flujo de orquestación con Python

### Fase 1: Extracción de frame (al subir video)

1. Endpoint `POST /api/recintos/:id/videos` recibe MP4
2. Spring Boot guarda MP4 en disco (UPLOAD_DIR)
3. Crea registro VIDEOS con estado=PENDIENTE
4. Invoca async: `python detector.py --modo extraer-frame --video <ruta> --frame-output <ruta_png>`
5. Lee resultado JSON de stdout
6. Actualiza VIDEOS: `ruta_frame_preview = <ruta_png>`, `estado = FRAME_LISTO`
7. Responde al frontend con video_id (response 201)

### Fase 2: Detección completa (al guardar zonas)

1. Endpoint `POST /api/videos/:id/zonas/confirmar` confirma las zonas
2. Spring Boot exporta zonas a JSON: `<zones_dir>/<uuid>.json`
3. Actualiza estado=PROCESANDO
4. Invoca async: `python detector.py --modo detectar --video <mp4> --output <csv> --zonas <json> ...`
5. Espera con timeout de 30 minutos
6. Lee CSV resultante
7. Inserta en DETECCIONES (batch)
8. Calcula métricas avanzadas (ver sección siguiente)
9. Inserta en METRICAS_ZONA y METRICAS_TEMPORALES
10. Actualiza estado=COMPLETADO

### ProcessBuilder

```java
ProcessBuilder pb = new ProcessBuilder(
    pythonBin,
    pythonScript,
    "--modo", modo,
    "--video", videoPath,
    // ... otros argumentos
);
pb.redirectErrorStream(false); // mantener stderr separado
Process p = pb.start();
```

Capturar stdout (JSON resumen) y stderr (logs/errores). Timeout configurable.

## Cálculo de métricas avanzadas

Después de insertar las detecciones del CSV, calcular las 4 métricas en SQL.

### Tráfico relativo

```sql
INSERT INTO metricas_zona (id_video, id_zona, total_detecciones, indice_trafico, ...)
SELECT 
    d.id_video,
    d.id_zona,
    COUNT(*) AS total_detecciones,
    COUNT(*) / (
        (SELECT COUNT(*) FROM detecciones WHERE id_video = ?) / 
        (SELECT COUNT(*) FROM zonas WHERE id_video = ?)
    ) AS indice_trafico,
    -- ...
FROM detecciones d
WHERE d.id_video = ?
GROUP BY d.id_video, d.id_zona;
```

### Tasa de detención

```sql
UPDATE metricas_zona mz
SET tasa_detencion = (
    SELECT SUM(CASE WHEN d.detenida THEN 1 ELSE 0 END) * 1.0 / COUNT(*)
    FROM detecciones d
    WHERE d.id_video = mz.id_video AND d.id_zona = mz.id_zona
)
WHERE mz.id_video = ?;
```

### Patrón temporal

```sql
INSERT INTO metricas_temporales (id_video, id_zona, franja_numero, ...)
SELECT 
    d.id_video,
    d.id_zona,
    FLOOR(d.frame_numero / (max_frame / 5)) AS franja,  -- 5 franjas
    COUNT(*) AS total
FROM detecciones d
WHERE d.id_video = ?
GROUP BY d.id_video, d.id_zona, franja;
```

### Score compuesto

```sql
UPDATE metricas_zona mz
SET score_compuesto = (
    0.40 * mz.indice_trafico +
    0.30 * mz.tasa_detencion +
    0.20 * (mz.densidad_promedio / promedio_densidad_recinto) +
    0.10 * mz.consistencia_temporal
)
WHERE mz.id_video = ?;
```

## Endpoints completos del MVP

### Autenticación

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| POST | `/api/auth/registro` | email, password, nombre, apellido | token, usuario |
| POST | `/api/auth/login` | email, password | token, usuario |

### Recintos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/recintos` | Lista recintos del usuario |
| POST | `/api/recintos` | Crear recinto |
| GET | `/api/recintos/:id` | Detalle |
| PUT | `/api/recintos/:id` | Editar |
| DELETE | `/api/recintos/:id` | Eliminar |

### Videos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/recintos/:id/videos` | Upload MP4 (multipart/form-data) |
| GET | `/api/videos/:id/estado` | Polling de estado |
| GET | `/api/videos/:id/frame-preview` | URL del PNG extraído |
| GET | `/api/recintos/:id/videos` | Historial |
| DELETE | `/api/videos/:id` | Eliminar |

### Zonas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/videos/:id/zonas` | Listar zonas |
| PUT | `/api/videos/:id/zonas` | Guardar zonas (batch) |
| POST | `/api/videos/:id/zonas/confirmar` | Confirmar y lanzar detección |

### Métricas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/videos/:id/metricas` | Métricas por zona |
| GET | `/api/videos/:id/metricas-temporales` | Patrón temporal |
| GET | `/api/videos/:id/detecciones` | Puntos para heatmap |
| POST | `/api/videos/:id/precio-sugerido` | Calcular precios con base |

## JWT y autenticación

### Configuración

- Algoritmo: HS256
- Secret: variable de entorno `JWT_SECRET` (mínimo 256 bits = 32 caracteres)
- Expiración: 24 horas
- Payload: `sub` (id_usuario), `email`, `iat`, `exp`

### JwtAuthFilter

`OncePerRequestFilter` aplicado a `/api/**` excepto `/api/auth/**`. Si el token es inválido → 401 con JSON estructurado, no redirect.

### Aislamiento de datos

Regla crítica: todos los recursos pertenecen a un usuario vía `RECINTOS.id_usuario`. En cada query filtrar por usuario logueado. Si un admin intenta acceder a recurso de otro → 404 (no 403, para no revelar existencia).

Patrón: inyectar `CurrentUser` que expone `getId()` y filtrar siempre con `findByIdAndUsuarioId(id, currentUser.getId())`.

## Procesamiento asíncrono

Usar `@Async` con `ThreadPoolTaskExecutor`:
- Pool de 2-3 threads (no saturar CPU con múltiples YOLO)
- Si Spring Boot reinicia durante PROCESANDO, al startup buscar videos en ese estado con timestamp >10min y marcar ERROR

## Variables de entorno

```env
DB_HOST=mysql
DB_PORT=3306
DB_NAME=flowsense
DB_USER=flowsense
DB_PASSWORD=<secret>

JWT_SECRET=<64-char-random>
JWT_EXPIRATION_HOURS=24

PYTHON_BIN=python3
PYTHON_SCRIPT=/app/python/detector.py
UPLOAD_DIR=/app/uploads
RESULTS_DIR=/app/results
ZONES_DIR=/app/zones
FRAMES_DIR=/app/frames

FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://<vercel-url>
```

Nunca commitear `.env` con valores reales. Usar `.env.example` con dummies.

## Convenciones de código

- Paquetes por feature (auth, usuarios, recintos), no por capa técnica
- DTOs obligatorios en request y response
- Bean Validation (@NotNull, @Email, @Size)
- Excepciones custom manejadas por @ControllerAdvice global
- Logs con SLF4J: INFO para negocio, DEBUG para detalles, ERROR para fallos reales
- Tests unitarios mínimos: AuthService, CalculadoraMetricasService

## Lo que Claude Code NO debe hacer en este módulo

- No exponer entidades JPA en endpoints (siempre DTOs)
- No hardcodear secrets, credenciales, URLs
- No olvidar filtrar por usuario logueado en queries
- No procesar video sincrónicamente bloqueando HTTP
- No agregar campos a DETECCIONES o METRICAS que permitan identificar personas
- No implementar funcionalidades del ROADMAP_POST_MVP sin actualizar primero el alcance
