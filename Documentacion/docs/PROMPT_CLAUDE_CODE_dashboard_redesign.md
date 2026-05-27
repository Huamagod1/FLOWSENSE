# FlowSense — Rediseño del dashboard + Vista de validación del modelo

## CONTEXTO

Estás trabajando en FlowSense, plataforma SaaS de análisis de flujo peatonal.
El MVP está completo, incluyendo tracking con ByteTrack y 8 métricas nuevas
(personas únicas, permanencia, flujo entre zonas, etc.) implementadas en una
sesión anterior. Todo está en la rama develop.

Antes de empezar, lee estos archivos para entender el estado actual:
- CLAUDE.md (raíz del repo)
- ALCANCE_COMPLETO.md
- Producto/frontend/src/pages/ResultadosPage.jsx (la tab actual)
- Producto/frontend/src/components/ (componentes existentes)
- Producto/python/src/detector_core.py
- Producto/python/src/tracker.py

---

## OBJETIVO DE ESTA SESIÓN

Dos cambios mayores:

1. **Rediseñar el dashboard completo** para reflejar las métricas de tracking
   como protagonistas. Hoy el dashboard fue diseñado cuando OTS era la métrica
   central, ahora personas únicas y permanencia son las que importan.

2. **Agregar una tab nueva de Validación** donde el admin puede ver el video
   procesado con overlay de detecciones, track_ids, zonas y trayectorias.
   Esto le permite verificar visualmente que el modelo está contando bien
   antes de confiar en los precios sugeridos.

---

## DECISIONES TÉCNICAS YA TOMADAS

- El video con overlay se genera como MP4 al final del procesamiento (no
  en tiempo real con canvas). Más simple, más rápido al reproducir.
- El admin ve el video original con caras visibles. La privacidad se
  documenta como "video temporal accesible solo por el dueño del recinto".
- La tab de Validación es la PRIMERA tab — antes que recomendación de precio.
  La credibilidad va primero.
- Nivel de detalle: video + panel de eventos en vivo + estadísticas por frame.

---

## NUEVA POLÍTICA DE PRIVACIDAD (actualizar en CLAUDE.md)

Reemplaza la sección de privacidad por:

```
PRIVACIDAD — POLÍTICA ACTUALIZADA

- El video original que sube el administrador se almacena temporalmente
  durante el ciclo de análisis y queda disponible para la tab de Validación
- Solo el usuario propietario del recinto (autenticado via JWT) puede
  acceder a esa vista — endpoint protegido y filtrado por id_usuario
- El admin puede eliminar el video manualmente desde el dashboard
  ("Eliminar video original") en cualquier momento
- En la base de datos, las DETECCIONES siguen siendo solo coordenadas
  anónimas con track_id efímero — esto NO cambia
- El reporte PDF y las vistas públicas del dashboard NO incluyen frames
  con caras visibles — solo aparecen en la tab de Validación interna
- El track_id es efímero, válido solo durante el análisis del video,
  y no se vincula a identidad real ni biometría
```

---

## PLAN DE EJECUCIÓN — 4 fases con verificación

═══════════════════════════════════════════════════════════════════
FASE 1 — PYTHON: generar MP4 con overlay y confiabilidad agregada
═══════════════════════════════════════════════════════════════════

### 1.1 — Crear `Producto/python/src/video_overlay.py`
Módulo nuevo que genera un MP4 procesado con overlay visual.

Funcionalidad:
- Lee el video original frame por frame con OpenCV
- Por cada frame, dibuja sobre la imagen:
  * Las zonas definidas por el admin (rectángulos con borde discontinuo
    y label de zona en esquina superior izquierda)
  * Las cajas de detección de cada persona detectada en ese frame
    (color único por track_id, paleta cíclica de 20 colores)
  * Encima de cada caja, etiqueta con "ID {track_id} · {confianza:.2f}"
  * Trayectoria del track: línea suave que conecta los últimos N (default 15)
    puntos donde apareció ese track_id, con gradiente de opacidad
- Escribe el MP4 resultante a /results/{uuid}_overlay.mp4
- Codec: H264 (mp4v), 24 fps de salida

Función principal:
```python
def generar_video_overlay(
    video_input: str,           # path al MP4 original
    csv_detecciones: str,       # path al CSV ya generado
    zonas_json: str,            # JSON de zonas
    video_output: str,          # path destino del MP4 procesado
    trail_length: int = 15      # cuántos frames atrás dibujar como trayectoria
) -> dict:
    """Retorna dict con stats: frames_procesados, duracion_seg, tamaño_archivo"""
```

### 1.2 — Crear `Producto/python/src/confiabilidad.py`
Calcula métricas agregadas de confiabilidad del análisis a partir del CSV.

Funciones:
```python
def calcular_confianza_promedio(df) -> float:
    """Promedio de la columna confianza (0-1) en todas las detecciones."""

def calcular_calidad_tracking(df) -> float:
    """
    Calidad del tracking medida como:
    1 - (frames_con_tracks_perdidos / frames_totales)
    Un track se considera "perdido" si aparece y luego desaparece antes
    del frame N+5 sin haber salido por borde del frame.
    """

def calcular_porcentaje_frames_ok(df, frames_esperados) -> float:
    """% de frames esperados que efectivamente fueron procesados."""

def generar_resumen_confiabilidad(df, frames_esperados) -> dict:
    """
    Retorna:
    {
        "confianza_promedio": 0.87,
        "calidad_tracking": 0.92,
        "frames_procesados_ok": 1.0,
        "score_global": 0.93,  # promedio ponderado
        "nivel": "ALTO"  # ALTO si score >= 0.8, MEDIO si >= 0.6, BAJO si < 0.6
    }
    """
```

### 1.3 — Crear `Producto/python/src/eventos.py`
Genera lista de eventos por frame para el panel en vivo del frontend.

```python
def generar_eventos(df, df_zonas) -> List[dict]:
    """
    Lista cronológica de eventos detectados.
    Tipos de evento:
    - "DETECCION": persona detectada en una zona (cada frame)
    - "ENTRADA": primer frame de un track_id en una zona
    - "SALIDA":  último frame de un track_id en una zona
    
    Retorna lista de:
    {
        "tiempo": 84.5,           # segundos
        "frame": 1247,
        "track_id": 47,
        "tipo": "ENTRADA",
        "zona_id": 1,
        "confianza": 0.92,
        "x_norm": 0.34, "y_norm": 0.58
    }
    """
```

### 1.4 — Modificar `Producto/python/detector.py`
Después de generar el CSV de detecciones, en modo `detectar`:
1. Llamar a `generar_video_overlay()` para crear el MP4 procesado
2. Llamar a `generar_resumen_confiabilidad()` para obtener el dict
3. Llamar a `generar_eventos()` para obtener la lista
4. Incluir en el JSON stdout los campos nuevos:
```json
{
  ...campos existentes...,
  "video_overlay_path": "/results/{uuid}_overlay.mp4",
  "confiabilidad": {
    "confianza_promedio": 0.87,
    "calidad_tracking": 0.92,
    "frames_procesados_ok": 1.0,
    "score_global": 0.93,
    "nivel": "ALTO"
  },
  "eventos_count": 2847
}
```
Los eventos individuales NO van al JSON stdout (sería muy grande).
En su lugar, escribirlos a un archivo JSON aparte: `/results/{uuid}_eventos.json`

>>> VERIFICACIÓN FASE 1:
    python detector.py --modo detectar [...] genera:
    - el CSV de detecciones (ya existía)
    - el MP4 con overlay visible
    - el JSON de eventos
    - el JSON stdout incluye confiabilidad y video_overlay_path
    pytest pasa los tests nuevos para confiabilidad.py y eventos.py

═══════════════════════════════════════════════════════════════════
FASE 2 — BASE DE DATOS: migraciones V11 y V12
═══════════════════════════════════════════════════════════════════

### V11__confiabilidad_video.sql
```sql
ALTER TABLE VIDEOS
  ADD COLUMN confianza_promedio       DOUBLE NULL,
  ADD COLUMN calidad_tracking         DOUBLE NULL,
  ADD COLUMN score_confiabilidad      DOUBLE NULL,
  ADD COLUMN nivel_confiabilidad      VARCHAR(10) NULL,
  ADD COLUMN video_overlay_path       VARCHAR(500) NULL,
  ADD COLUMN eventos_json_path        VARCHAR(500) NULL;
```

### V12__no_index.sql (vacío opcional o índices si necesario)
Solo si hay queries de eventos que necesiten índice. Probablemente no.

>>> VERIFICACIÓN FASE 2:
    docker compose up backend
    Flyway aplica V11 limpiamente, backend arranca sin errores.

═══════════════════════════════════════════════════════════════════
FASE 3 — BACKEND SPRING BOOT
═══════════════════════════════════════════════════════════════════

### 3.1 — Modificar entidad `Video`
Agregar campos: confianzaPromedio, calidadTracking, scoreConfiabilidad,
nivelConfiabilidad, videoOverlayPath, eventosJsonPath.

### 3.2 — Modificar `PythonOrchestratorService`
Parsear los nuevos campos del JSON stdout y persistirlos en VIDEOS.

### 3.3 — Endpoints nuevos en `VideoQueryController`

```
GET /api/videos/:id/confiabilidad
  Retorna: { confianzaPromedio, calidadTracking, scoreConfiabilidad,
             nivelConfiabilidad }

GET /api/videos/:id/video-overlay
  Retorna: stream del archivo MP4 procesado
  Headers: Content-Type: video/mp4
  Validación: solo el dueño del recinto puede acceder
  Si video fue eliminado: 404

GET /api/videos/:id/eventos?desde=:frame_desde&hasta=:frame_hasta
  Retorna: lista de eventos del rango (lee del JSON cacheado en disco)
  Si no se pasan parámetros: retorna primeros 100 eventos
  Paginación: max 500 eventos por request

DELETE /api/videos/:id/video-original
  Permite al admin eliminar el video original y el video con overlay
  Las métricas y detecciones quedan intactas (son anónimas)
  Marca videos.video_original_disponible = false
```

### 3.4 — Agregar campo `videoOriginalDisponible` a VIDEOS
Booleano. true por defecto, false cuando el admin lo elimina.
Esto es separado de las migraciones — agregar en V13 si necesario, o
incluir en V11.

### 3.5 — DTOs nuevos
- `ConfiabilidadResponse`: campos de confiabilidad
- `EventoDto`: tiempo, frame, trackId, tipo, zonaId, confianza, xNorm, yNorm
- `EventosResponse`: lista de eventos + total + paginación

>>> VERIFICACIÓN FASE 3:
    mvn clean compile sin errores.
    Probar endpoints con Postman o curl.

═══════════════════════════════════════════════════════════════════
FASE 4 — FRONTEND REACT — REDISEÑO COMPLETO DEL DASHBOARD
═══════════════════════════════════════════════════════════════════

### Estructura nueva de ResultadosPage.jsx
5 tabs en este orden EXACTO:

1. **Validación del análisis** (nueva — la primera)
2. **Resumen** (nueva)
3. **Recomendación de precio** (nueva)
4. **Análisis detallado** (reorganización de tabs existentes)
5. **Flujo y trayectorias** (la tab de tracking actual, renombrada)

### 4.1 — Crear `src/components/VideoValidacion.jsx`
La tab más importante del rediseño. Layout:

```
┌─────────────────────────────────────────────────────────────┐
│ Narrativa explicativa arriba                                │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  En este frame:          │
│                                  │  ┌──────┬──────┐         │
│   <video> reproductor HTML5      │  │ 4    │ 4    │         │
│   con el video overlay.mp4       │  │Detec │Tracks│         │
│   reproducido directamente       │  └──────┴──────┘         │
│                                  │                          │
│   Eventos por frame se sincro-   │  Acumulado:              │
│   nizan con video.currentTime    │  ┌──────┬──────┐         │
│                                  │  │ 347  │ 2184 │         │
│                                  │  │P.Únic│Detec.│         │
│                                  │  └──────┴──────┘         │
│                                  │                          │
│                                  │  ✓ Confiabilidad         │
│                                  │  Conf: ━━━━━━━━ 87%      │
│                                  │  Trk:  ━━━━━━━━━ 92%     │
│                                  │  Frm:  ━━━━━━━━━━ 100%   │
├──────────────────────────────────┴──────────────────────────┤
│ Tabla de eventos del frame actual ± 5 frames                │
│ (se actualiza con onTimeUpdate del video)                   │
├──────────────────────────────────────────────────────────────┤
│ Botón "Eliminar video original" (con confirmación)          │
└─────────────────────────────────────────────────────────────┘
```

Implementación:
- Usar `<video controls>` HTML5 nativo apuntando a /api/videos/:id/video-overlay
- Listener `onTimeUpdate` para saber qué frame se está viendo
- Cada vez que cambia el frame actual, recalcular eventos visibles
- Llamar al endpoint /api/videos/:id/eventos al inicio para cargar todo
  (o paginar si son muchos)
- Mostrar caja de confiabilidad con barras verdes/amarillas/rojas según
  nivelConfiabilidad
- Botón eliminar video con `confirm()` JS estándar

### 4.2 — Crear `src/components/ResumenEjecutivo.jsx`
Layout:
- Narrativa en lenguaje natural ("Tu recinto recibió 1.847 personas únicas...")
- 4 KPIs principales en cards: Personas únicas, Permanencia, Zonas, Zona top
- Las dos primeras cards con borde azul (protagonistas)
- Dos gráficos lado a lado: ranking de zonas por personas únicas y por permanencia
- Insight automático al final tipo "Las zonas X y Y concentran 64% del tráfico"

La narrativa y el insight se generan en frontend a partir de los datos
ya disponibles. No requiere endpoint nuevo.

### 4.3 — Crear `src/components/RecomendacionPrecio.jsx`
Layout:
- Narrativa explicativa
- Tabla con columnas: Zona, Tipo (Premium/Estándar/Bajo), Personas únicas,
  Permanencia, Score, Precio sugerido, Justificación (texto auto-generado)
- El "Tipo" se calcula desde el score:
  * Score >= 1.5 → Premium (badge verde)
  * Score >= 0.8 → Estándar (badge amarillo)
  * Score <  0.8 → Bajo (badge rojo)
- Texto de justificación automático según las métricas:
  * Si personas_unicas alto y permanencia alta: "Alto tráfico + alta permanencia. Zona destino."
  * Si personas_unicas alto y permanencia baja: "Buena exposición, tráfico constante."
  * Si personas_unicas medio: "Promedio del recinto. Precio base."
  * Si personas_unicas bajo: "Zona de paso, requiere incentivos."
- Caja informativa abajo: "Cómo se calcula el precio: precio base × score"
- Botón "Descargar reporte PDF" (puede quedar como TODO)

### 4.4 — Reorganizar componentes existentes
- Crear `src/components/AnalisisDetallado.jsx` que agrupa:
  * Tabla completa con TODAS las métricas (incluyendo OTS como respaldo)
  * Gráfico de métricas temporales (de la tab actual)
  * Heatmap (mejorado para usar personas únicas en vez de detecciones brutas
    si es posible — sino dejar como está)

- En la tab "Flujo y trayectorias" mantener:
  * TrayectoriasCanvas.jsx
  * FlujoSankeyChart.jsx
  * MetricasTrackingPanel.jsx con tabla de top 5 rutas

### 4.5 — Crear `src/api/validacion.js`
```javascript
export const getConfiabilidad = (videoId) =>
  axiosInstance.get(`/videos/${videoId}/confiabilidad`);

export const getVideoOverlayUrl = (videoId) =>
  `${axiosInstance.defaults.baseURL}/videos/${videoId}/video-overlay`;

export const getEventos = (videoId, desde, hasta) =>
  axiosInstance.get(`/videos/${videoId}/eventos`, {
    params: { desde, hasta }
  });

export const eliminarVideoOriginal = (videoId) =>
  axiosInstance.delete(`/videos/${videoId}/video-original`);
```

### 4.6 — Modificar `ResultadosPage.jsx`
Reescribir la estructura de tabs:
```jsx
<Tabs defaultActiveKey="validacion">
  <TabPane key="validacion" tab="Validación">
    <VideoValidacion videoId={videoId} />
  </TabPane>
  <TabPane key="resumen" tab="Resumen">
    <ResumenEjecutivo metricas={metricas} />
  </TabPane>
  <TabPane key="precio" tab="Recomendación de precio">
    <RecomendacionPrecio metricas={metricas} />
  </TabPane>
  <TabPane key="detalle" tab="Análisis detallado">
    <AnalisisDetallado metricas={metricas} temporales={metricasTemporales} />
  </TabPane>
  <TabPane key="flujo" tab="Flujo y trayectorias">
    <FlujoTrayectorias videoId={videoId} />
  </TabPane>
</Tabs>
```

Mantener el polling de estado del video y la lógica de carga de datos.

>>> VERIFICACIÓN FASE 4:
    npm run dev, abrir un video procesado
    Verificar que las 5 tabs cargan sin errores
    Verificar que la tab Validación reproduce el video y los eventos se
    sincronizan con el tiempo del video
    Verificar que un video sin tracking (track_id=-1) no rompe nada
    Verificar que un video sin overlay aún muestra las otras tabs

═══════════════════════════════════════════════════════════════════
FASE 5 — PRUEBA END-TO-END
═══════════════════════════════════════════════════════════════════

Flujo completo:
1. Subir video → Python procesa con ByteTrack
2. Verificar que se genera el MP4 overlay y el JSON de eventos
3. Backend persiste confiabilidad en VIDEOS
4. Frontend muestra las 5 tabs con la nueva estructura
5. Tab Validación reproduce el video correctamente
6. Tab Resumen muestra KPIs correctos
7. Tab Recomendación de precio muestra precios con justificación
8. mvn clean compile pasa sin errores

---

## RESTRICCIONES TÉCNICAS

- Python permanece en 3.12
- opencv-python-headless en Docker (full opencv falla)
- Coordenadas siempre normalizadas (0-1)
- Recurso ajeno → 404 (no 403)
- @Async con pool 2-3 threads — no cambiar
- Compatibilidad hacia atrás: videos sin overlay aún deben mostrar
  el resto del dashboard sin errores
- El JAR del backend debe reconstruirse con --build cuando hay
  cambios en src/

---

## ORDEN ESTRICTO DE COMMITS

- feat(python): video con overlay + confiabilidad + eventos por frame
- feat(db): migración V11 para confiabilidad y paths
- feat(backend): endpoints de validación y eliminación de video
- feat(frontend): rediseño dashboard con 5 tabs nuevas
- test(e2e): validación del rediseño completo

Trabajar en rama feature/dashboard-redesign desde develop.
PR a develop al terminar.

---

## SI ALGO SALE MAL

- Si OpenCV no escribe MP4: instalar imageio-ffmpeg como fallback
- Si el video overlay es muy pesado: bajar resolución a 720p en la generación
- Si los eventos son demasiados para cargar de una: implementar paginación
  real con scroll infinito en el frontend
- Si Flyway falla con duplicate column: ya conoces el procedimiento
  (DROP / DELETE FROM flyway_schema_history)
