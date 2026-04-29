# CLAUDE.md — Contexto raíz de FlowSense

Este archivo da contexto global a Claude Code para todo el repositorio. Los `CLAUDE.md` específicos de cada capa (`/Producto/python`, `/Producto/backend`, `/Producto/frontend`, `/Producto/database`) complementan este archivo con detalles técnicos.

## Qué es FlowSense

Plataforma web SaaS que analiza el flujo peatonal en espacios comerciales (malls, galerías, ferias) mediante visión artificial. El administrador sube un video MP4, define zonas sobre el plano del recinto y obtiene métricas objetivas de tráfico por zona para justificar precios de arriendo ante arrendatarios.

El producto es **offline por diseño**: no analiza video en tiempo real ni requiere hardware especial. Procesa MP4 ya grabados con cámara de seguridad o celular.

## Stack técnico

| Capa | Tecnología | Deploy |
|---|---|---|
| Frontend | React 18 + Vite + react-router-dom 6 | Vercel |
| Backend | Spring Boot 3 + Java 17 + Spring Security + JWT | Railway |
| Visión IA | Python 3.11 + YOLOv8n (ultralytics) + OpenCV | Proceso invocado desde Spring Boot vía ProcessBuilder |
| Base de datos | MySQL 8 | Railway (plugin) |
| Email | Spring Mail con Gmail SMTP o Mailtrap | Dev/Prod |
| Orquestación local | Docker Compose | Todos los devs |

## Arquitectura en una frase

React sube MP4 → Spring Boot lo almacena y orquesta el pipeline → invoca Python vía ProcessBuilder → Python procesa con YOLOv8 y escribe CSV anónimo → Spring Boot lee CSV, inserta en MySQL y calcula métricas agregadas → React consulta API REST y renderiza heatmap + dashboard.

## Estructura del repositorio

```
FLOWSENSE/
├── CLAUDE.md                    ← este archivo (contexto global)
├── README.md                    ← portada para humanos: cómo levantar el stack
├── ALCANCE_COMPLETO.md          ← fuente única de verdad del alcance funcional
├── docker-compose.yml
├── Documentacion/               ← entregables académicos
│   └── docs/                    ← EV-01 (registro), EV-02 (Figma), EV-03 (MER), etc.
├── Gestion/                     ← documentos internos del equipo
│   └── Integrantes.txt
├── Producto/                    ← entregable técnico (todo el código)
│   ├── python/                  ← detector YOLOv8
│   │   └── CLAUDE.md
│   ├── backend/                 ← API Spring Boot
│   │   └── CLAUDE.md
│   ├── frontend/                ← SPA React
│   │   └── CLAUDE.md
│   └── database/                ← migraciones SQL y MER
│       └── CLAUDE.md
└── video/                       ← videos de prueba/demo (no se versionan grandes)
```

## Material de prueba del MVP

Para validación académica se graban **2 videos de 15 minutos** en el mismo recinto, en horarios de contraste:

- **Video 1 — Hora pico**: sábado mediodía o viernes tarde-noche. Rico en detecciones, ideal para demos visuales.
- **Video 2 — Hora valle**: día de semana media tarde o mañana temprano. Referencia baja para la comparativa.

Esta doble muestra permite alimentar la vista comparativa (HU-05) y demostrar que el sistema es sensible a variación temporal, no solo a volumen absoluto.

Los videos se guardan en `/video/` y **no se versionan en Git** (añadir `video/*.mp4` al `.gitignore`).

## Decisiones cerradas del producto

### Un solo rol: ADMINISTRADOR

El sistema tiene un solo rol funcional. No hay superadmin, no hay arrendatarios, no hay empleados. La gestión de usuarios se hace mediante dos vías: registro público y invitación entre admins dentro de una misma organización.

### Concepto de organización

Cada usuario pertenece a una `ORGANIZACION`. Los recintos son propiedad de la organización, no del usuario individual. Esto permite que un mall con varios administradores compartan los mismos recintos. Al registrarse públicamente se crea automáticamente una organización.

### Autenticación con JWT stateless

JWT en `Authorization: Bearer <token>` con expiración de 24h. Secret en variable de entorno `JWT_SECRET`. Sin sesiones server-side, sin cookies.

### Contraseñas con BCrypt

Nunca texto plano, nunca MD5/SHA1. BCrypt strength 10.

### Recuperación de contraseña con email real

Vía Spring Mail. En dev se usa Mailtrap o Gmail SMTP con contraseña de aplicación. En prod, servicio real. Tokens expiran en 24h.

### Procesamiento offline de video

Python se invoca como subproceso asincrónico desde Spring Boot (`ProcessBuilder` + `@Async`). No hay websockets, no hay streaming. El frontend hace polling cada 3s al endpoint de estado hasta que el video quede en `COMPLETADO`.

## Restricciones éticas no negociables

Estas restricciones se aplican en toda la capa de detección y persistencia. Si una implementación propuesta las viola, debe cuestionarse antes de escribir código:

- **Nunca** almacenar imágenes de personas. Los frames se procesan en RAM y se descartan.
- **Nunca** implementar reconocimiento facial ni tracking individual.
- **Nunca** guardar en BD nada que permita identificar a una persona (caras, ropa, contextura). Solo coordenadas numéricas.
- Cumplimiento Ley 19.628 y Ley 21.719 de Chile.

## Convenciones de equipo

### Equipo y responsables por capa

| Integrante | Rol principal | Carpetas que toca principalmente |
|---|---|---|
| Fernando Huamanchumo | Frontend / Dashboard | `/Producto/frontend` |
| Fernando Tapia | Backend + Visión IA | `/Producto/python`, `/Producto/backend` |
| Octavio Ibáñez | DBA + QA + Docs | `/Producto/database`, `/Documentacion` |

Todos los integrantes pueden tocar cualquier área; los responsables son quienes lideran decisiones de esa capa, no dueños exclusivos.

### Git workflow

- **Ramas principales**: `main` (producción), `develop` (integración).
- **Ramas feature**: `feature/<area>-<descripcion-corta>`. Ejemplos: `feature/python-detector`, `feature/backend-auth`, `feature/frontend-login`.
- **PR obligatorio** para mergear a `develop`. Al menos una revisión antes de merge.
- **Merge a `main`** solo al cierre de cada sprint, con todos los tests pasando.
- **Commits** en español, formato imperativo: "agrega endpoint de login", "corrige cálculo de métricas por zona".

### Entorno de desarrollo

Todo el equipo usa Docker Compose para levantar el stack completo. Un desarrollador que clona el repo debería poder correr `docker compose up` y tener backend + python + MySQL corriendo. El frontend se levanta aparte con `npm run dev` para hot reload.

### Documentación académica

El proyecto es parte de TPY1101 (DuocUC). Las decisiones priorizan:
1. **Trazabilidad** — cada HU está vinculada a una evidencia verificable.
2. **Claridad** — el código y los nombres son autoexplicativos.
3. **Simplicidad** — no optimizar prematuramente. Un MVP funcional es mejor que un sistema complejo incompleto.

## Planificación vigente (Carta Gantt)

Los sprints y su alcance están en `ALCANCE_COMPLETO.md`. Estado actual: **Sprint 2 en curso (semanas 3-4)**.

### Entregables clave del Sprint 2

- **Pipeline core Python + Backend**:
  - `detector.py` que procesa MP4 → CSV anónimo
  - Endpoints Spring Boot: upload de video, estado, orquestación con ProcessBuilder
  - Inserción masiva de detecciones en MySQL + cálculo de métricas
- **Autenticación básica**:
  - Tablas `usuarios`, `organizaciones`, `tokens_auth` en MySQL
  - Endpoints `/api/auth/registro`, `/api/auth/login` con JWT
  - Filtro de seguridad JWT aplicado a rutas `/api/**`

Los detalles específicos por capa están en el `CLAUDE.md` de cada subcarpeta.

## Referencias cruzadas

- Alcance funcional completo: `ALCANCE_COMPLETO.md`
- Detalles de detección: `Producto/python/CLAUDE.md`
- API REST: `Producto/backend/CLAUDE.md`
- Vistas y rutas: `Producto/frontend/CLAUDE.md`
- MER y migraciones: `Producto/database/CLAUDE.md`

## Qué esperar de Claude Code al trabajar en este repo

- Respetar las restricciones éticas en todo código relacionado con procesamiento de video.
- Seguir las convenciones de Git del equipo (ramas, PRs, formato de commits).
- Consultar `ALCANCE_COMPLETO.md` antes de proponer cambios funcionales que afecten múltiples capas.
- Priorizar legibilidad sobre "cleverness" — este es código que revisa un docente y mantiene un equipo que está aprendiendo.
- Nunca generar código que guarde frames, imágenes de personas o datos biométricos.
- Nunca hardcodear secrets, tokens JWT, contraseñas ni credenciales de email en el código.

## Archivos legacy de la raíz (pendiente de limpiar)

Los siguientes archivos en la raíz del repo son de pruebas previas y **no forman parte del producto oficial**. Deben ignorarse o eliminarse en una tarea de limpieza:

- `main.py`, `tracker.py`, `coco.txt`, `yolov8s.pt`, `video.zip`, `__pycache__/`

El código oficial vive exclusivamente dentro de `/Producto/*`.

## Decisión de versión Python

El proyecto usa Python 3.12 (no 3.11 como se indicó originalmente). 
Razón: compatibilidad con wheels precompilados de numpy 1.26 y ultralytics 
8.3.x. Python 3.13+ causa problemas de compilación con estas dependencias.
Todo el equipo debe usar Python 3.12 en todos los equipos de desarrollo.

## Modelos YOLOv8 soportados

El sistema soporta tres modelos intercambiables via CLI (--modelo):

| Modelo | Tamaño | Velocidad CPU | Precisión | Cuándo usar |
|--------|--------|---------------|-----------|-------------|
| yolov8n | 6 MB | ~0.6s/frame | Base | Pruebas, demos rápidos |
| yolov8s | 22 MB | ~1.5s/frame | Media | Recintos típicos (default recomendado) |
| yolov8m | 52 MB | ~3.5s/frame | Alta | Escenas densas (ferias, malls llenos) |

Default actual: yolov8n (por backward compatibility). 
Recomendado para producción: yolov8s o yolov8m.

## Fundamento conceptual del producto

FlowSense mide "exposición comercial ponderada por tiempo". Cada 
detección en el CSV representa un instante de presencia humana en una 
zona. Al muestrear a 1 fps, cada detección equivale a 1 segundo de 
presencia. La acumulación de detecciones por zona es equivalente a 
"persona-segundos", la unidad de exposición comercial.

Esta métrica es estándar en el retail y la publicidad exterior (OTS: 
Opportunity To See). No distingue entre atención activa y pasiva porque:
1. La exposición periférica tiene valor comercial demostrado
2. La presencia física genera prueba social (atrae a otros)
3. A escala, la distribución de intenciones es proporcional entre zonas
4. Medir intenciones individuales requeriría biometría (ilegal en Chile)

## Flujo del editor de zonas

El flujo correcto de análisis incluye un paso de definición de zonas 
ANTES del procesamiento del video:

1. Admin sube MP4 → estado PENDIENTE
2. Python extrae frame representativo (segundo 5) → estado FRAME_LISTO
3. Admin ve el frame, dibuja rectángulos sobre él → estado ESPERANDO_ZONAS
4. Admin guarda zonas y lanza análisis → estado PROCESANDO
5. Python detecta con esas zonas → estado COMPLETADO

Las zonas se dibujan sobre el frame del video (no un plano abstracto) 
para que las coordenadas sean directamente aplicables.