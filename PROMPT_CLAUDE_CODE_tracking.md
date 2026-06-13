# FlowSense — Implementación de tracking con ByteTrack + métricas de trayectoria

## CONTEXTO

Trabajas en FlowSense, plataforma SaaS de análisis de flujo peatonal por visión
artificial. El MVP está funcionalmente completo en sus 4 capas (commit HEAD 29b0a70).

Antes de empezar, lee estos archivos para entender el proyecto:
- `CLAUDE.md` (raíz del repo)
- `ALCANCE_COMPLETO.md` (fuente de verdad funcional)
- `Producto/python/src/` (todos los módulos del detector)
- `Producto/backend/src/main/java/cl/duoc/flowsense/procesamiento/` (servicios de procesamiento)

IMPORTANTE: `CLAUDE.md` contiene una regla "no agregar tracking individual".
Esa decisión fue revisada por el equipo y revertida. Ignora esa restricción.
Este trabajo consiste precisamente en agregar tracking.

## OBJETIVO

El sistema actual detecta personas frame a frame de forma independiente — sin
memoria entre frames. Vamos a agregar tracking con ByteTrack para asignar un
`track_id` persistente a cada persona durante todo el video, y con eso calcular
7 métricas nuevas + mejorar 2 existentes.

### Métricas que ya existen (NO tocar su cálculo base, solo coexisten)
OTS, total detecciones, porcentaje del total, densidad promedio, pico máximo,
tasa de detención, índice de tráfico, score compuesto, precio sugerido,
métricas temporales.

### Métricas NUEVAS a implementar (por zona)
1. Personas únicas — COUNT DISTINCT track_id
2. Tiempo de permanencia promedio — AVG de frames por track_id (fps=1, frame=segundo)
3. Entradas y salidas — primer/último frame de cada track_id en cada zona
4. Flujo entre zonas — transiciones zona_origen → zona_destino por track
5. Tasa de conversión de zona — % de tracks de zona_A que llegan a zona_B
6. Velocidad de flujo promedio — distancia euclidiana normalizada entre frames
7. Tiempo de permanencia por track — detalle individual para histograma

### Métricas a MEJORAR
- OTS con tracking — SUM de frames por track_id en zona (evita doble conteo)
- Score compuesto v2 — recalcular incluyendo personas únicas reales

---

## REGLAS TÉCNICAS NO NEGOCIABLES

- Python permanece en 3.12 exacto (lapx tiene wheels para 3.12)
- Mantener `opencv-python-headless` — NO usar opencv-python full en Docker
- Coordenadas siempre normalizadas (0-1) en toda la base de datos
- Acceso a recurso de otro usuario sigue retornando 404 (no 403)
- Procesamiento @Async con pool de 2-3 threads — no cambiar
- COMPATIBILIDAD HACIA ATRÁS OBLIGATORIA: videos procesados sin tracking
  tendrán track_id = -1; el frontend y backend deben manejarlos sin error
- El modo `--stub` debe seguir funcionando para CI sin GPU: el stub genera
  track_ids ficticios secuenciales correlacionados con las detecciones
- No hardcodear JWT_SECRET ni passwords

---

## PLAN DE EJECUCIÓN — 5 fases con verificación entre cada una

Ejecuta las fases EN ORDEN. Al terminar cada fase, detente y verifica el
criterio antes de continuar a la siguiente.

═══════════════════════════════════════════════════════════════════
FASE 1 — PYTHON: integrar ByteTrack
═══════════════════════════════════════════════════════════════════

### 1.1 — `Producto/python/requirements.txt`
Agregar: `lapx>=0.5.5`
(ByteTrack viene integrado en ultralytics; lapx provee el solver de asignación)

### 1.2 — Crear `Producto/python/src/tracker.py`
Wrapper de ByteTrack:
- Clase `ByteTracker` con método `track(frame) -> List[Deteccion]`
- Usa la API de ultralytics: `model.track(frame, persist=True,
  tracker="bytetrack.yaml", classes=[0], conf=0.45, iou=0.7, verbose=False)`
- Cada `Deteccion` lleva: track_id (int), x_centro_norm, y_centro_norm,
  ancho_norm, alto_norm, confianza
- Si `results[0].boxes.id is None` (frame sin tracks), retorna lista vacía
- Coordenadas via `results[0].boxes.xywhn` (normalizadas)

### 1.3 — Modificar `Producto/python/src/detector_core.py`
- Reemplazar `model.predict()` por `model.track(persist=True)`
- `persist=True` es crítico: mantiene el estado del tracker entre frames

### 1.4 — Modificar `Producto/python/src/detector_stub.py`
- El stub debe generar track_ids ficticios secuenciales (1, 2, 3...)
- Simular persistencia: un track ficticio "vive" varios frames antes de
  desaparecer, para que las métricas de permanencia tengan datos reales en test

### 1.5 — Modificar `Producto/python/src/output.py`
Nuevo contrato del CSV (agregar columna track_id después de zona_id):
```
id_video,frame_numero,zona_id,track_id,x_centro_norm,y_centro_norm,confianza,detenida
```
Si el tracker no asignó id, usar -1.

### 1.6 — Crear `Producto/python/src/metricas_tracking.py`
Funciones puras (entrada: DataFrame pandas del CSV, salida: dict/list).
Implementar exactamente estas funciones:

```
calcular_personas_unicas(df_zona) -> int
    df_zona['track_id'].nunique()  (excluyendo -1)

calcular_tiempo_permanencia_promedio(df_zona, fps=1) -> float
    por cada track_id contar frames en la zona, promediar. fps=1 → frames=segundos

calcular_tiempo_permanencia_por_track(df_zona, fps=1) -> List[dict]
    [{"track_id": int, "segundos": float}, ...]  para histograma

calcular_entradas_salidas(df, zona_id) -> dict
    entrada = primer frame del track en zona_id
    salida  = último frame del track en zona_id
    retorna {"entradas": int, "salidas": int}

calcular_velocidad_flujo_promedio(df_zona, fps=1) -> float
    distancia euclidiana normalizada entre frames consecutivos del mismo
    track_id, promediada. unidad: normalizado/segundo

calcular_flujo_entre_zonas(df) -> List[dict]
    por cada track_id, secuencia de zonas ordenada por frame_numero
    contar transiciones zona_a → zona_b
    retorna [{"zona_origen": int, "zona_destino": int, "conteo": int}]
    umbral mínimo: reportar solo flujos con conteo >= 3

calcular_tasa_conversion(df, zona_origen_id, zona_objetivo_id) -> float
    de los tracks que pasaron por zona_origen, % que llegó a zona_objetivo

calcular_ots_tracking(df_zona) -> float
    suma de frames por track_id en la zona (OTS sin doble conteo)
```

### 1.7 — Modificar `Producto/python/src/cli.py`
Agregar argumento `--tracker` con default `bytetrack`.
Si `--tracker none`, comportamiento anterior sin tracking.

### 1.8 — Modificar el JSON stdout (modo detectar)
El JSON que Python escribe a stdout debe incluir además:
```json
{
  "frames_procesados": 900,
  "detecciones_totales": 1847,
  "personas_unicas_total": 234,
  "tiempo_permanencia_promedio_global": 18.4,
  "flujo_entre_zonas": [
    {"zona_origen": 1, "zona_destino": 2, "conteo": 87}
  ],
  "metricas_por_zona": {
    "1": {
      "personas_unicas": 120,
      "tiempo_permanencia_promedio": 22.1,
      "entradas": 125, "salidas": 118,
      "ots_tracking": 2652,
      "velocidad_flujo_promedio": 0.034
    }
  },
  "status": "OK"
}
```
Mantener TODOS los campos que el JSON ya tenía.

### 1.9 — Tests
Agregar `test_metricas_tracking.py` con casos para cada función:
personas únicas, permanencia, entradas/salidas, flujo entre zonas.

>>> VERIFICACIÓN FASE 1 — no continuar hasta cumplir:
    cd Producto/python && python detector.py --stub --modo detectar \
      --video test.mp4 --output out.csv --zonas zonas.json --tracker bytetrack
    - out.csv tiene columna track_id con enteros >= 1
    - el JSON stdout incluye metricas_por_zona y flujo_entre_zonas
    - pytest pasa todos los tests

═══════════════════════════════════════════════════════════════════
FASE 2 — BASE DE DATOS: migraciones Flyway
═══════════════════════════════════════════════════════════════════

### 2.1 — `Producto/database/` migración V8__tracking_columns.sql
```sql
ALTER TABLE DETECCIONES
  ADD COLUMN track_id INT NOT NULL DEFAULT -1 AFTER zona_id;
CREATE INDEX idx_detecciones_track ON DETECCIONES (track_id);
CREATE INDEX idx_detecciones_video_track ON DETECCIONES (id_video, track_id);

CREATE TABLE TRACKS (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video        BIGINT NOT NULL,
  track_id        INT NOT NULL,
  zona_inicio_id  BIGINT,
  zona_fin_id     BIGINT,
  primer_frame    INT NOT NULL,
  ultimo_frame    INT NOT NULL,
  frames_total    INT NOT NULL,
  segundos_total  DOUBLE NOT NULL,
  velocidad_prom  DOUBLE,
  CONSTRAINT fk_tracks_video FOREIGN KEY (id_video) REFERENCES VIDEOS(id)
);

CREATE TABLE FLUJO_ENTRE_ZONAS (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video        BIGINT NOT NULL,
  zona_origen_id  BIGINT NOT NULL,
  zona_destino_id BIGINT NOT NULL,
  conteo_tracks   INT NOT NULL,
  CONSTRAINT fk_flujo_video FOREIGN KEY (id_video) REFERENCES VIDEOS(id)
);
```

### 2.2 — migración V9__metricas_tracking.sql
```sql
ALTER TABLE METRICAS
  ADD COLUMN personas_unicas         INT,
  ADD COLUMN tiempo_permanencia_prom DOUBLE,
  ADD COLUMN entradas                INT,
  ADD COLUMN salidas                 INT,
  ADD COLUMN ots_tracking            DOUBLE,
  ADD COLUMN velocidad_flujo_prom    DOUBLE,
  ADD COLUMN tasa_conversion         DOUBLE,
  ADD COLUMN score_compuesto_v2      DOUBLE;

CREATE TABLE METRICAS_TRACKING (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video  BIGINT NOT NULL,
  id_zona   BIGINT NOT NULL,
  track_id  INT NOT NULL,
  segundos  DOUBLE NOT NULL,
  CONSTRAINT fk_mt_video FOREIGN KEY (id_video) REFERENCES VIDEOS(id)
);
```

>>> VERIFICACIÓN FASE 2:
    docker compose up flowsense-db, confirmar que Flyway aplica V8 y V9
    sin error. Las migraciones V1-V7 NO se tocan.

═══════════════════════════════════════════════════════════════════
FASE 3 — BACKEND SPRING BOOT
═══════════════════════════════════════════════════════════════════

### 3.1 — Entidades JPA
- `Deteccion`: agregar campo `Integer trackId` mapeado a columna track_id
- Crear entidad `Track` (tabla TRACKS)
- Crear entidad `FlujoEntreZonas` (tabla FLUJO_ENTRE_ZONAS)
- Crear entidad `MetricaTracking` (tabla METRICAS_TRACKING)
- `Metrica`: agregar los 8 campos nuevos

### 3.2 — Repositorios JPA nuevos
- `TrackRepository`, `FlujoEntreZonasRepository`, `MetricaTrackingRepository`
- Todos con queries filtradas por id_video

### 3.3 — Modificar `CsvParserService`
Leer la nueva columna track_id del CSV. Mapear al campo trackId de Deteccion.
Si la columna no existe (CSV viejo), usar -1 — esto da compatibilidad atrás.

### 3.4 — Modificar `MetricasCalculatorService`
Después de insertar DETECCIONES, calcular y persistir las 8 métricas nuevas.
Usar queries SQL agregadas (no procesar en memoria):
```sql
-- personas únicas por zona
SELECT zona_id, COUNT(DISTINCT track_id) FROM DETECCIONES
WHERE id_video = ? AND track_id != -1 GROUP BY zona_id;

-- tiempo permanencia: frames por track, luego AVG por zona
SELECT zona_id, track_id, COUNT(*) FROM DETECCIONES
WHERE id_video = ? AND track_id != -1 GROUP BY zona_id, track_id;
```
El flujo entre zonas requiere lógica en Java: por cada track_id obtener la
secuencia de zona_id ordenada por frame_numero y contar transiciones.

### 3.5 — Crear `TrackingMetricsService`
Servicio separado que:
- Persiste TRACKS (una fila por video+track_id)
- Persiste FLUJO_ENTRE_ZONAS (lee el campo flujo_entre_zonas del JSON Python)
- Persiste METRICAS_TRACKING (detalle por track para histograma)

### 3.6 — Modificar `PythonOrchestratorService`
Al parsear el JSON stdout de Python, extraer los campos nuevos
(personas_unicas_total, flujo_entre_zonas, metricas_por_zona) y pasarlos
a `TrackingMetricsService`.

### 3.7 — DTOs nuevos
- `TrackDto`: trackId, zonaInicioId, zonaFinId, segundosTotal, velocidadProm
- `FlujoZonasDto`: zonaOrigenId, zonaDestinoId, conteoTracks
- `MetricasTrackingResponse`: los 8 campos nuevos + distribución de permanencia
- `MetricasResponse` existente: agregar los 8 campos nuevos (mantener los viejos)

### 3.8 — Endpoints nuevos en `VideoQueryController`
```
GET /api/videos/:id/tracks            → lista de TRACKS, orden segundos DESC
GET /api/videos/:id/flujo-zonas       → lista de FLUJO_ENTRE_ZONAS, orden conteo DESC
GET /api/videos/:id/metricas-tracking → METRICAS_TRACKING agrupadas para histograma
```
Todos filtrados por id_usuario del token. Recurso ajeno → 404.

>>> VERIFICACIÓN FASE 3:
    cd Producto/backend && mvn clean compile  → sin errores
    Levantar backend, probar los 3 endpoints nuevos con un video de prueba

═══════════════════════════════════════════════════════════════════
FASE 4 — FRONTEND REACT
═══════════════════════════════════════════════════════════════════

### 4.1 — `Producto/frontend/package.json`
Verificar que recharts soporta Sankey (v2.x lo incluye). Si falta algo, agregar.

### 4.2 — Crear `src/api/tracking.js`
```javascript
export const getTracks = (videoId) =>
  axiosInstance.get(`/videos/${videoId}/tracks`);
export const getFlujoZonas = (videoId) =>
  axiosInstance.get(`/videos/${videoId}/flujo-zonas`);
export const getMetricasTracking = (videoId) =>
  axiosInstance.get(`/videos/${videoId}/metricas-tracking`);
```

### 4.3 — Crear `src/components/TrayectoriasCanvas.jsx`
Canvas HTML5 que dibuja trayectorias de tracks sobre el frame de preview.
- Props: tracks (array de {track_id, puntos}), canvasAncho, canvasAlto, imagenFondo
- Cada track = línea de color único (paleta cíclica de 20 colores)
- Grosor proporcional a segundos_total
- Click en línea → tooltip {track_id, zona_inicio, zona_fin, segundos}
- Usar utils/coordenadas.js para convertir normalizadas → píxeles

### 4.4 — Crear `src/components/FlujoSankeyChart.jsx`
Diagrama Sankey con recharts. Input: {source, target, value} por flujo.

### 4.5 — Crear `src/components/MetricasTrackingPanel.jsx`
Grid 2x4 de cards con las métricas: personas únicas, permanencia promedio,
entradas/salidas, OTS tracking, velocidad de flujo, tasa de conversión,
mini histograma de distribución de permanencia (recharts BarChart).

### 4.6 — Modificar `ResultadosPage.jsx`
Agregar una tab nueva "Tracking" junto a las tabs existentes.
La tab contiene, en orden: TrayectoriasCanvas, FlujoSankeyChart,
MetricasTrackingPanel. NO modificar las tabs existentes.

### 4.7 — Modificar exportación PDF
Agregar al reporte PDF una página con métricas de tracking + Sankey.
Usar html2canvas sobre FlujoSankeyChart.

>>> VERIFICACIÓN FASE 4:
    npm run dev, abrir un video procesado, confirmar que la tab Tracking
    muestra trayectorias, Sankey y las 8 métricas sin errores de consola.
    Confirmar que un video viejo (track_id -1) no rompe la tab.

═══════════════════════════════════════════════════════════════════
FASE 5 — PRUEBA END-TO-END
═══════════════════════════════════════════════════════════════════

Flujo completo con docker compose up:
1. Subir video → extraer frame → dibujar zonas → confirmar
2. Python procesa con ByteTrack → CSV con track_id → JSON con métricas
3. Spring Boot lee CSV → inserta DETECCIONES con track_id → calcula 8 métricas
4. Frontend muestra tab Tracking con todo funcionando

>>> CRITERIO DE ÉXITO FINAL:
    - mvn clean compile pasa sin errores
    - python detector.py --stub genera CSV con track_id y JSON con metricas_por_zona
    - el flujo E2E completo funciona en docker compose
    - un video sin tracking (track_id -1) sigue mostrando sus métricas viejas

---

## ORDEN ESTRICTO DE COMMITS

Hacer un commit al final de cada fase (no antes), con `mvn clean compile`
verificado en las fases que tocan backend. Mensajes sugeridos:
- feat(python): integrar ByteTrack y métricas de tracking
- feat(db): migraciones V8 y V9 para tracking
- feat(backend): servicios y endpoints de métricas de tracking
- feat(frontend): tab de tracking con trayectorias y flujo entre zonas
- test(e2e): validación del pipeline completo con tracking

Trabajar sobre la rama `feature/tracking-bytetrack` partiendo de `develop`.
Merge a develop vía PR al terminar.

---

## SI ALGO SALE MAL

- Si lapx falla al instalar: verificar que Python es exactamente 3.12
- Si model.track() da error: confirmar persist=True y tracker="bytetrack.yaml"
- Si Flyway falla: las migraciones nuevas deben ser V8 y V9, sin tocar V1-V7
- Si el frontend rompe con videos viejos: revisar el manejo de track_id = -1
- Ante drift de scope: este trabajo es SOLO tracking + 8 métricas. No agregar
  otras funcionalidades del backlog (PDF export ya existe, no rehacerlo).
