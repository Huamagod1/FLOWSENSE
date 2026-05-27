# CLAUDE.md — Contexto raíz de FlowSense

Este archivo da contexto global a Claude Code para todo el repositorio. Los `CLAUDE.md` específicos de cada capa (`/Producto/python`, `/Producto/backend`, `/Producto/frontend`, `/Producto/database`) complementan este archivo con detalles técnicos.

## Qué es FlowSense

Plataforma web SaaS que analiza el flujo peatonal en espacios comerciales (malls, galerías, ferias) mediante visión artificial. El administrador sube un video MP4, define zonas sobre un frame del video y obtiene métricas objetivas de valor comercial por zona para apoyar decisiones de pricing de arriendo.

El producto es **offline por diseño**: no analiza video en tiempo real ni requiere hardware especial. Procesa MP4 ya grabados con cámara de seguridad o celular.

## Problema que resuelve

Los administradores de espacios comerciales en Chile fijan precios de arriendo sin datos objetivos. Esto genera dos problemas: el administrador pierde dinero cobrando de menos en zonas valiosas, y los arrendatarios se sienten engañados sin justificación verificable. FlowSense democratiza el acceso a analítica de tráfico peatonal, antes reservada para grandes operadores con sistemas profesionales costosos como Brickstream o Sensormatic.

## Fundamento conceptual del producto

FlowSense implementa la métrica **OTS (Opportunity To See)** aplicada al retail interior. Esta métrica es estándar en la industria publicitaria desde los años 80 y se usa globalmente para fijar precios de exposición visual en espacios comerciales.

La idea base es: el valor comercial de una ubicación es proporcional al tiempo total que las personas pasan ahí, no solo al conteo de personas únicas. Una zona con 100 personas-segundo de exposición vale el doble que una con 50, sin importar si fueron 100 personas pasando rápido o 20 personas detenidas.

Por diseño matemático, al muestrear video a 1 frame por segundo, cada detección equivale a 1 segundo de presencia humana en una zona. Acumular detecciones por zona = acumular persona-segundos = medir OTS. La métrica emerge naturalmente del muestreo simple sin necesidad de tracking individual.

## Las 4 métricas del MVP

El sistema entrega 4 métricas por cada zona definida:

| Métrica | Qué mide | Decisión que habilita |
|---------|----------|----------------------|
| Tráfico relativo | Detecciones por zona, normalizado al promedio del recinto | Ranking de zonas más vs menos transitadas |
| Tasa de detención | % de detecciones que aparecen detenidas vs caminando | Distinguir paso de interés comercial |
| Patrón temporal | Variación del tráfico durante el video, dividido en franjas | Pricing diferenciado por horario |
| Score compuesto | Combinación ponderada de las anteriores en un solo número | Traducción directa a precio sugerido |

El score compuesto se calcula como:

```
score = (0.40 × indice_trafico) + 
        (0.30 × tasa_detencion) + 
        (0.20 × densidad_normalizada) + 
        (0.10 × consistencia_temporal)
```

Donde cada componente está normalizado al promedio del recinto. Una zona con score 2.5x se interpreta como "el doble y medio del valor del local promedio del recinto".

## Stack técnico

| Capa | Tecnología | Deploy |
|------|-----------|--------|
| Frontend | React 18 + Vite + react-router-dom 6 + react-konva + recharts + heatmap.js | Vercel |
| Backend | Spring Boot 3 + Java 17 + Spring Security + JWT + Spring Mail | Railway |
| Visión IA | Python 3.12 + YOLOv8 (ultralytics 8.3.x) + OpenCV | Proceso invocado vía ProcessBuilder |
| Base de datos | MySQL 8 | Railway (plugin) |
| Orquestación local | Docker Compose | Todos los devs |

**Versión de Python crítica**: usar Python 3.12. No 3.11 ni 3.13+. Razón: compatibilidad con wheels precompilados de numpy 1.26 y ultralytics 8.3.

## Arquitectura del flujo principal

El flujo completo desde que el admin sube un video hasta que recibe las métricas:

```
1.  Admin sube MP4 desde React → Spring Boot
2.  Spring Boot guarda MP4, crea VIDEOS con estado=PENDIENTE
3.  Spring Boot invoca Python: --modo extraer-frame
4.  Python extrae frame del segundo 5, devuelve PNG
5.  Estado=FRAME_LISTO, frontend redirige al editor de zonas
6.  Admin dibuja rectángulos sobre el frame con react-konva
7.  Estado=ESPERANDO_ZONAS mientras dibuja
8.  Admin guarda zonas y lanza análisis
9.  Spring Boot invoca Python: --modo detectar (--fps 10 --tracker bytetrack)
10. Python procesa el video con YOLOv8 + ByteTrack, escribe CSV anónimo
    con columnas: frame_numero, zona_id, track_id, x/y_centro_norm, confianza, detenida
11. Python genera video overlay (H.264) con trayectorias dibujadas
12. Python escribe JSON resumen con 8 métricas de tracking por zona a stdout
13. Spring Boot lee CSV, inserta en DETECCIONES, calcula métricas clásicas
14. Spring Boot lee JSON resumen, inserta en TRACKS, FLUJO_ENTRE_ZONAS,
    METRICAS_TRACKING y CONFIABILIDAD_VIDEO
15. Estado=COMPLETADO, frontend redirige al dashboard de 5 tabs
16. Admin ve métricas, score, trayectorias y precios sugeridos
17. Admin puede eliminar el video original manualmente para liberar espacio
```

## Estructura del repositorio

```
FLOWSENSE/
├── CLAUDE.md                       ← este archivo
├── README.md                       ← portada para humanos
├── ALCANCE_COMPLETO.md             ← alcance funcional MVP
├── ROADMAP_POST_MVP.md             ← funcionalidades planificadas fuera de alcance
├── ESTADO_PROYECTO.md              ← snapshot de progreso (se actualiza periódicamente)
├── docker-compose.yml
├── Documentacion/                  ← entregables académicos
├── Gestion/                        ← documentos del equipo
└── Producto/                       ← código fuente
    ├── python/                     ← detector YOLOv8
    ├── backend/                    ← API Spring Boot
    ├── frontend/                   ← SPA React
    └── database/                   ← migraciones SQL y MER
```

## Decisiones cerradas del producto

### Modelo de usuarios

- Un solo rol: ADMINISTRADOR
- Concepto de ORGANIZACIÓN (admins pueden invitar a otros admins, opcional)
- Registro público + invitación entre admins (post-MVP)
- JWT stateless (24h, HS256, BCrypt strength 10)

### Modelo de detección

- YOLOv8 con classes=[0] (solo personas) del dataset COCO
- 3 modelos soportados: yolov8n (default), yolov8s, yolov8m
- Tracking anónimo con ByteTrack (lapx): asigna track_id temporal (entero) por persona dentro del video; sin biometría ni identidad persistente
- track_id = -1 para detecciones sin track asignado (compatibilidad hacia atrás con videos procesados antes del tracking)
- **Sample rate actual**: 10 fps (antes 1 fps). Necesario para tracking estable entre frames; ByteTrack requiere continuidad temporal.
- Métrica derivada: persona-segundos por zona = OTS; con tracking: OTS sin doble conteo vía SUM de frames por track_id
- Las zonas son filtro POSTERIOR a YOLO (YOLO detecta en todo el frame)
- **Video overlay**: Python genera un MP4 con las trayectorias de tracking dibujadas sobre el video original. Codec H.264 (avc1); fallback a imageio + libx264 si avc1 no está disponible en OpenCV.

### Material de prueba del MVP académico

- 1 video controlado: experimento con guión donde tú sabes el ground truth
- 1 video real: 3-15 minutos de un recinto real (galería, café, pasillo)
- Análisis comparativo entre conteo manual y conteo del sistema
- Documentación del experimento como evidencia de validación

### Restricciones éticas no negociables

Estas restricciones aplican a todo el sistema. Si una implementación las viola, debe cuestionarse:

- NUNCA almacenar imágenes de personas (procesamiento solo en RAM). Excepción única: el frame estático del segundo 5 para el editor de zonas — no contiene personas identificables en la mayoría de los casos y es el fondo del canvas.
- NUNCA implementar reconocimiento facial ni tracking biométrico (sin rasgos faciales, edad, género, color de ropa ni identidad persistente entre sesiones)
- El tracking anónimo con ByteTrack está permitido: track_id es un entero temporal dentro de la sesión de procesamiento del video, sin vinculación a identidad real
- NUNCA guardar datos que permitan identificar individuos fuera de su sesión de procesamiento
- **Política de video original**: el MP4 subido se almacena temporalmente en el servidor y es accesible solo para el administrador dueño del recinto. El admin puede eliminarlo manualmente desde la UI (`DELETE /api/videos/:id/video-original`). Las detecciones en BD son anónimas (solo coordenadas normalizadas + track_id efímero). El video overlay generado (con trayectorias) sí se persiste para la tab de Validación.
- Cumplimiento Ley 19.628 y Ley 21.719 de Chile (datos personales y biometría)
- Contraseñas SIEMPRE con BCrypt strength 10
- JWT secret en variable de entorno, nunca hardcoded
- HTTPS obligatorio en producción

## Convenciones de equipo

### Equipo y responsables por capa

| Integrante | Rol principal | Carpetas que lidera |
|-----------|---------------|---------------------|
| Fernando Huamanchumo | Frontend / Dashboard | /Producto/frontend |
| Fernando Tapia | Backend + Visión IA | /Producto/python, /Producto/backend |
| Octavio Ibáñez | DBA + QA + Docs | /Producto/database, /Documentacion |

Todos pueden tocar cualquier área. Los responsables lideran decisiones, no son dueños exclusivos.

### Git workflow

- Ramas principales: `main` (producción), `develop` (integración)
- Ramas feature: `feature/<area>-<descripcion>`. Ejemplos: `feature/python-detector`, `feature/backend-auth-pipeline`
- PR obligatorio para mergear a `develop`. Al menos una revisión.
- Merge a `main` solo al cierre de cada sprint con todos los tests pasando
- Commits en español, formato imperativo: "agrega endpoint X", "corrige cálculo Y"
- Convención de commits para issues: incluir referencia al ticket en el mensaje cuando aplique

### Entorno de desarrollo

- Docker Compose para levantar el stack completo
- Python 3.12 obligatorio (no usar otra versión)
- VS Code con extensión de Claude Code recomendada
- En equipos nuevos: clonar, ejecutar Docker, instalar Python 3.12, crear venv

### Documentación académica

El proyecto es parte de TPY1101 (DuocUC). Las decisiones priorizan:
1. Trazabilidad: cada HU vinculada a evidencia verificable
2. Claridad: código y nombres autoexplicativos
3. Simplicidad: no optimizar prematuramente, MVP funcional > sistema complejo incompleto
4. Validación empírica: cada feature crítica debe tener prueba que demuestre que funciona

## Planificación de sprints (5 sprints totales)

### Sprint 1 ✅ Completado
- Setup repo, Docker, estructura, CLAUDE.md base

### Sprint 2 ✅ Completado
- Pipeline Python con YOLOv8 ✅
- Modos stub y preview ✅
- Soporte multi-modelo ✅
- Backend: autenticación (registro, login, JWT) ✅
- Frontend: vistas de login y registro ✅
- Backend: endpoint de upload de video ✅
- Backend: orquestación con ProcessBuilder ✅

### Sprint 3 ✅ Completado
- Modo `--modo extraer-frame` en Python ✅
- Endpoint backend para servir el frame ✅
- Editor visual de zonas en React (react-konva) ✅
- Persistencia de zonas en BD ✅
- Flujo end-to-end: subir → zonas → procesar → CSV en BD ✅

### Sprint 4 ✅ Completado
- 4 métricas clásicas (tráfico, detención, temporal, score) ✅
- Tracking individual con ByteTrack ✅ (adelantado de post-MVP)
- 8 métricas de tracking (personas únicas, permanencia, flujo…) ✅
- Sample rate 10 fps para tracking estable ✅
- Video overlay H.264 con trayectorias ✅
- Dashboard React con 5 tabs (validación, resumen, precio, detalle, flujo) ✅
- Score de confiabilidad del análisis (ALTO/MEDIO/BAJO) ✅
- Sistema de precios sugeridos ✅
- Migraciones BD hasta V11 ✅

### Sprint 5 📋 En curso (cierre académico)
- Grabación de videos de validación
- Procesamiento y análisis comparativo
- Documento técnico de validación empírica
- Exportación PDF de reportes
- Documentación final del proyecto
- Preparación de presentación

## Referencias cruzadas

- Alcance funcional completo: `ALCANCE_COMPLETO.md`
- Roadmap post-MVP: `ROADMAP_POST_MVP.md`
- Estado actual: `ESTADO_PROYECTO.md`
- Detalles Python: `Producto/python/CLAUDE.md`
- Detalles Backend: `Producto/backend/CLAUDE.md`
- Detalles Frontend: `Producto/frontend/CLAUDE.md`
- Detalles BD: `Producto/database/CLAUDE.md`

## Qué esperar de Claude Code en este repo

- Respetar restricciones éticas en todo código que toque video o personas
- Seguir convenciones de Git (ramas, PRs, formato de commits)
- Consultar `ALCANCE_COMPLETO.md` antes de proponer cambios funcionales
- Priorizar legibilidad sobre "cleverness"
- Nunca generar código que guarde frames, imágenes de personas o datos biométricos
- Nunca hardcodear secrets, tokens, contraseñas
- Cuando una decisión técnica afecte múltiples capas, mencionarlo explícitamente
- Antes de modificar comportamiento existente, garantizar backward compatibility
