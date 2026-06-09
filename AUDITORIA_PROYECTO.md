# AUDITORÍA DEL PROYECTO FLOWSENSE — para revisión externa

**Fecha**: 2026-06-09 · **Rama auditada**: `feature/dashboard-redesign` · **Alcance**: solo lectura, sin cambios de código.

Este documento es deliberadamente crítico: su objetivo es detectar gaps antes de la presentación, no quedar bien.

---

## SECCIÓN 1 — INVENTARIO DEL DASHBOARD (`Producto/frontend/src/pages/ResultadosPage.jsx`)

La página orquesta 8 llamadas API al pasar a `COMPLETADO` (`ResultadosPage.jsx:50-69`):
`/detecciones`, `/metricas`, `/metricas-temporales`, `/zonas`, `/tracks`, `/flujo-zonas`, `/metricas-tracking`, `/confiabilidad`, más `/frame-preview/imagen` (blob).

### Tab 1 — "Validación del análisis"

**Componente**: `Producto/frontend/src/components/VideoValidacion.jsx`

| Dato mostrado | Fuente | Explicación HOY | ¿Contexto comparativo? |
|---|---|---|---|
| Video overlay con trayectorias | `GET /videos/:id/video-overlay` (blob autenticado, `api/validacion.js`) | Card narrativa "¿Cómo funciona esta vista?" | n/a |
| "Detectadas ahora" / "Trackeadas" (frame actual) | Calculado client-side desde `GET /videos/:id/eventos` (ventana ±0.8s) | Tooltip `?` (`TOOLTIPS_STATS`, líneas 8-13) | Sin comparación (aceptable: es un conteo instantáneo) |
| "Personas únicas" (total) | Client-side: trackIds distintos de eventos tipo `ENTRADA` | Tooltip `?` | **Sin contexto** — número absoluto, no se compara con nada |
| "Detecciones" (total) | Client-side: `eventos.length` | Tooltip `?` | **Sin contexto** |
| Confianza modelo / Calidad tracking / Score global | `GET /videos/:id/confiabilidad` (`confianzaPromedio`, `calidadTracking`, `scoreConfiabilidad`) | Tooltips `?` (`TOOLTIPS_CONF`, líneas 23-27) con umbrales explicados (>70%, >80%) | Sí — umbrales en tooltip |
| Nivel ALTO/MEDIO/BAJO | `nivelConfiabilidad` | Texto interpretativo (`TEXTOS_NIVEL`, líneas 17-21) | Sí |
| Panel "Eventos recientes" (±1s) | `/eventos` con mapeo trackId→P1,P2… | Subtítulo "(±1s · t=mm:ss)" | n/a |
| Botón "Eliminar video original" | `DELETE /videos/:id/video-original` | Confirm nativo (`window.confirm`, línea 166) | n/a |

**Nota**: las "Personas únicas" de esta tab se calculan en el cliente desde eventos `ENTRADA`, mientras que la tab Flujo las saca de `METRICAS.personas_unicas` (SQL). Dos fuentes distintas para el mismo concepto → pueden no coincidir en vivo.

### Tab 2 — "Resumen"

**Componente**: `Producto/frontend/src/components/ResumenEjecutivo.jsx`

> ⚠️ **BUG CRÍTICO**: `hayTracking` (línea 13) evalúa `metricasTracking?.some(t => (t.personasUnicas || 0) > 0)`, pero `GET /videos/:id/metricas-tracking` devuelve `MetricaTrackingResponse` con solo `{idZona, trackId, segundos}` (`Producto/backend/.../dto/MetricaTrackingResponse.java`). El campo `personasUnicas` **no existe en esa respuesta** → `hayTracking` es **siempre false**. Consecuencias:
> - La tab Resumen **siempre** muestra el modo fallback "Persona-segundos" aunque el tracking funcione.
> - "Ranking por personas únicas" siempre cae a "Ranking por detecciones" con nota "* Tracking no disponible".
> - "Ranking por permanencia" siempre muestra "Datos de permanencia no disponibles. Se requiere análisis con ByteTrack activado" — **aunque ByteTrack esté activado**.
> - Los datos correctos SÍ existen: `GET /metricas` (`MetricaResponse`) trae `personasUnicas` y `tiempoPermanenciaProm` por zona. El fix es leer de `metricas`, no de `metricasTracking`.
> - Contradicción visible en demo: el banner de `ResultadosPage.jsx:117` promete "las métricas principales son personas únicas (sin doble conteo)" y la primera tab de datos muestra persona-segundos.

| Dato mostrado | Fuente | Explicación HOY | ¿Contexto comparativo? |
|---|---|---|---|
| Narrativa automática | Derivada de `/metricas` (+ `/metricas-tracking`, roto) | Es la explicación en sí | Parcial |
| KPI "Persona-segundos" (debería ser "Personas únicas") | `metricas.totalDetecciones` sumado | Subtítulo "OTS total del recinto" | **Sin contexto** (no hay vs promedio ni por minuto) |
| KPI "Permanencia promedio" | `metricasTracking.tiempoPermanenciaProm` (campo inexistente → siempre "—") | Subtítulo "por persona por zona" | **Sin contexto** |
| KPI "Zonas analizadas" | `metricas.length` | Subtítulo "áreas del recinto" | n/a |
| KPI "Zona top" | Máximo de detecciones | Subtítulo "mayor tráfico" | Implícito (es un ranking de 1) |
| Gráfico ranking (barras) | `/metricas` | Título | **Sin línea de promedio** (la tab Detalle sí la tiene) |
| Insight "top 2 concentran X%" | Client-side | Texto interpretativo con umbrales 50/70% | Sí |

### Tab 3 — "Recomendación de precio"

**Componente**: `Producto/frontend/src/components/RecomendacionPrecio.jsx`

| Dato mostrado | Fuente | Explicación HOY | ¿Contexto comparativo? |
|---|---|---|---|
| Fórmula del score | Estática (card narrativa, líneas 78-88) | Explica pesos 40/30/20/10 | Sí ("score 2.0x = doble del promedio") |
| Score gauge por zona | `metricas.scoreCompuesto` | Label "score de valor comercial"; gauge normalizado a 2.5 sin decirlo | Sí — el score ya es relativo al promedio (1.0 = promedio), pero **no se dice "1.0 = promedio" en esta tab** (sí en tab Detalle) |
| Badge Premium/Estándar/Bajo | Umbrales client-side `getTipoZona()` (≥1.5 / ≥1.0 / ≥0.8) | Solo en nota final | Sí |
| Precio sugerido + diff vs base | `POST /videos/:id/precio-sugerido` → `precioSugeridoClp` | Línea tachada del base + delta % | Sí |
| Justificación textual | `justificacion()` client-side sobre `totalDetecciones` y `tasaDetencion` | Es la explicación | Sí |

**Inconsistencia de discurso**: `justificacion()` (línea 19) dice "Alto tráfico + **alta permanencia**" pero el dato que evalúa es `tasaDetencion` (% detenidas), no la permanencia de tracking. Son métricas distintas que conviven en el producto.

**Sin persistencia**: el precio base no se guarda; al recargar la página se pierde (el backend tiene `precioBaseClp` en `ResumenAnalisisResponse` pero el frontend nunca lo lee — ver Sección 2).

### Tab 4 — "Análisis detallado"

**Componente**: `Producto/frontend/src/components/AnalisisDetallado.jsx`

| Dato mostrado | Fuente | Explicación HOY | ¿Contexto comparativo? |
|---|---|---|---|
| Mapa de calor por zona | `metricas.personasUnicas` + `/zonas` + frame | Subtítulo + leyenda de gradiente | Implícito (normalización min-max entre zonas) |
| Ranking de tráfico (barras) | `metricas.totalDetecciones` | Subtítulo + tooltip rico (% del total, Nx promedio) | **Sí — el mejor del dashboard**: `ReferenceLine` de promedio (línea 312) + label "(1.5x)" por barra |
| Insight 💼/📍 zona top/bottom | Client-side | Texto con % y acción sugerida | Sí |
| Comportamiento del visitante (cards %) | `metricas.tasaDetencion` | Labels ZONA DE PASO / INTERÉS MODERADO / ZONA DE INTERÉS con sublabel | Sí (umbrales 20/50%) |
| Matriz temporal zona × franja | `GET /videos/:id/metricas-temporales` (`franjaNumero`, `segundoInicio/Fin`, `totalDetecciones`) | Leyenda de colores + warning si <5 franjas | **No — umbrales absolutos fijos** (0 / 1-2 / 3-5 / 6+ detecciones) que no escalan: a 10 fps casi cualquier celda activa cae en "6+" rojo |
| Vista tabular resumen | `/metricas` | Tooltips `?` por columna (`ColHeader`) | Columna "% Total" sí; "Score" explica "1.0 = promedio" en tooltip |
| Resumen ejecutivo (oportunidades/alertas/próximos pasos) | Client-side | Es interpretación | Sí |
| Conclusiones | Client-side | Es interpretación | Sí |

**Problemas**:
1. El tooltip de "Detecciones" (línea 131) afirma: *"Cada detección = 1 segundo de presencia humana"*. **Esto era cierto a 1 fps; con el sample rate actual de 10 fps cada detección ≈ 0.1 s.** Ver Sección 4.1.
2. El título dice "Concentración de **tráfico** peatonal" pero el heatmap escala por `personasUnicas` (línea 223), no por detecciones — el resto de la tab usa detecciones como "tráfico". Mezcla silenciosa de métricas.
3. La prop `detecciones` (puntos del heatmap real, `GET /detecciones`) **se recibe y nunca se usa** — el fetch completo es desperdicio (ver Sección 2).
4. `densidadRelativa` de metricas-temporales no se usa; la matriz usa conteos brutos.

### Tab 5 — "Flujo y trayectorias"

**Componentes**: `TrayectoriasCanvas.jsx`, `FlujoSankeyChart.jsx`, `MetricasTrackingPanel.jsx` (+ markup inline en `ResultadosPage.jsx:164-210`)

| Dato mostrado | Fuente | Explicación HOY | ¿Contexto comparativo? |
|---|---|---|---|
| Canvas zonas + burbujas personas únicas | `/zonas`, `metricas.personasUnicas`, frame | Subtítulo en `ResultadosPage.jsx:174` | No |
| Flechas de flujo agregado | `GET /videos/:id/flujo-zonas` (`conteoTracks`) | Subtítulo | Grosor proporcional al máximo |
| Arcos de trayectorias individuales (máx. 30) | `GET /videos/:id/tracks` (`zonaInicioId`, `zonaFinId`, `framesTotal`) | Nota al pie con conteo | n/a |
| Sankey simplificado origen→destino | `/flujo-zonas` | Nota "ancho proporcional…" | Sí (proporcional) |
| KPI Personas únicas totales | `metricas.personasUnicas` sumado | Subtítulo "sin doble conteo (ByteTrack)" — **engañoso**: la suma por zona SÍ doble-cuenta personas que visitaron varias zonas (el propio `ResumenEjecutivo.jsx:15` lo admite en comentario) | No |
| KPI Permanencia promedio | `metricas.tiempoPermanenciaProm` (promedio simple entre zonas) | Subtítulo "segundos por persona" | No |
| KPI Total entradas | `metricas.entradas` | Subtítulo "cruces de zona detectados" | No |
| KPI OTS sin doble conteo | `metricas.otsTracking` | Subtítulo "persona-segundos únicos" | No |
| Tabla por zona (7 columnas) | `/metricas` | **Sin tooltips** — única tabla del dashboard sin explicación por columna. "OTS tracking" y "Vel. flujo prom." se muestran **sin unidad ni definición** | No |

**Dead prop**: `MetricasTrackingPanel` recibe `metricasTracking` y `zones` y no usa ninguna de las dos (`MetricasTrackingPanel.jsx:6`). Todo sale de `metricas`.

---

## SECCIÓN 2 — DATOS CALCULADOS PERO NO VISUALIZADOS

### 2.1 Campos de API que ninguna pestaña muestra

**`GET /videos/:id/metricas` → `MetricaResponse`** (`dto/MetricaResponse.java`):

| Campo | Estado |
|---|---|
| `porcentajeDelTotal` | No usado — el frontend lo **recalcula** client-side en 3 lugares |
| `densidadPromedio` | Nunca mostrado |
| `picoMaximo` | Nunca mostrado (dato valioso: "momento de máxima ocupación por zona") |
| `framesConActividad` | Nunca mostrado |
| `confianzaPromedio` (por zona) | Nunca mostrado (solo se muestra la global de confiabilidad) |
| `areaZona` | Nunca mostrado |
| `densidadPorArea` | Nunca mostrado (entra al score con peso 20% pero es invisible) |
| `indiceValorRelativo` | Nunca mostrado directamente — el "Nx promedio" de los gráficos se recalcula client-side |
| `tasaConversion` | Nunca mostrado |
| `scoreCompuestoV2` | Nunca mostrado (existe un score v2 con tracking que nadie ve; el dashboard usa `scoreCompuesto` v1) |

**`GET /videos/:id/metricas-tracking` → `MetricaTrackingResponse`** (`{idZona, trackId, segundos}`):
**100% sin usar correctamente.** `ResumenEjecutivo` lo consume con campos que no existen (bug Sección 1, Tab 2) y `MetricasTrackingPanel` lo ignora. Es la materia prima ideal para un histograma de distribución de permanencia por zona — hoy es un fetch muerto.

**`GET /videos/:id/tracks` → `TrackDto`**: de 9 campos solo se usan `zonaInicioId`, `zonaFinId`, `framesTotal`. Sin usar: `trackId`, `primerFrame`, `ultimoFrame`, `segundosTotal`, `velocidadProm`.

**`GET /videos/:id/detecciones` → `DeteccionHeatmapPoint` (`x`, `y`, `zonaId`)**: se hace el fetch en `ResultadosPage.jsx:52`, se pasa como prop a `AnalisisDetallado`… **y no se usa ningún campo**. El heatmap actual pinta gradientes por centro de zona, no por puntos reales. Para videos largos esto es un payload grande descargado para nada.

**`GET /videos/:id/eventos` → `EventoDto`**: sin usar: `confianza`, `xNorm`, `yNorm`, `frame`.

**`GET /videos/:id/metricas-temporales` → `MetricaTemporalResponse`**: sin usar: `densidadRelativa`, `nombreZona` (se resuelve por `idZona` contra `metricas`).

**`GET /videos/:id/confiabilidad` → `ConfiabilidadResponse`**: ✅ todos los campos usados.

### 2.2 Endpoints sin ningún consumidor en el frontend

| Endpoint | Ubicación backend | Observación |
|---|---|---|
| `GET /videos/:id/resumen` | `VideoQueryController.java:138` | Devuelve `ResumenAnalisisResponse` (incluye `precioBaseClp` y `preciosSugeridos` persistidos, `duracionSegundos`, `fechaCalculo`) — exactamente lo que la tab Precio necesita para no perder el precio base al recargar. Muerto. |
| `PUT /videos/:id/analisis` | `VideoQueryController.java:130` | Duplica el flujo `PUT /zonas` + `POST /zonas/confirmar` que sí usa `EditorZonasPage.jsx:190-191`. Muerto. |
| `GET/PUT /recintos/:id/zonas` | `recintos/ZonaController.java` | Duplica las rutas de zonas vía video. Sin consumidor. |
| `GET /videos/:id` | `VideoQueryController.java:55` | Sin consumidor detectado en `src/`. |

---

## SECCIÓN 3 — CUMPLIMIENTO DEL ALCANCE (vs `ALCANCE_COMPLETO.md`)

### HUs del MVP

| HU | Estado | Evidencia |
|---|---|---|
| HU-01 subir video | ✅ Completa | `SubirVideoPage.jsx`, `VideoController.java` |
| HU-02 editor de zonas | ✅ Completa | `EditorZonasPage.jsx` |
| HU-03 mapa de calor | ⚠️ Parcial | Existe heatmap por zona, pero **no usa los puntos de detección reales** (`/detecciones` ignorado); es un gradiente por centro de zona. heatmap.js (stack declarado) no se usa. |
| HU-04 tabla de métricas | ✅ Completa | Tabla en `AnalisisDetallado.jsx:436` |
| HU-08 multi-recintos | ✅ Completa | `RecintosPage.jsx`, CRUD completo |
| HU-21 tasa de detención | ✅ Completa | Cards "Comportamiento del visitante" |
| HU-22 patrón temporal | ✅ Completa | Matriz zona × franja |
| HU-23 score | ✅ Completa | Tab Precio + tabla Detalle |
| HU-24 precio sugerido | ⚠️ Completa con gap | Funciona, pero el precio base no persiste en UI (endpoint `/resumen` que lo devuelve está muerto) |
| HU-11/12/13 auth | ✅ Completas | `AuthController.java`, `AuthContext.jsx` |
| **HU-06 exportar PDF** | ❌ **No implementada** | `jspdf` y `html2canvas` están en `package.json:17-18` pero **cero imports en `src/`**. No existe botón de exportación. Respuesta directa a la pregunta: **la exportación PDF no funciona con el dashboard actual porque no existe.** |
| **HU-25 validación empírica** | ⚠️ Parcial | Ver abajo |
| HU-10 repo documentado | ⚠️ Parcial | `CLAUDE.md` raíz referencia `ESTADO_PROYECTO.md` que **no existe** en el repo |

### Las 4 métricas: cálculo vs visualización

| Métrica | Se calcula en | Se visualiza en |
|---|---|---|
| Tráfico relativo (`indice_valor_relativo`) | `MetricasCalculatorService.calcIndice()` | Indirecto: ratios "Nx" recalculados client-side en rankings (Detalle, tooltip). El campo API no se lee. |
| Tasa de detención | `MetricasCalculatorService` (SQL `sum_detenida`) | Tab Detalle (cards + tabla), tab Precio (justificación) |
| Patrón temporal | `calcularMetricasTemporales()` | Tab Detalle (matriz). `densidadRelativa` calculada y no mostrada. |
| Score compuesto | `MetricasCalculatorService.calcScore()` | Tab Precio (gauge) + tabla Detalle. `scoreCompuestoV2` calculado y nunca mostrado. |

### Soporte actual para HU-25 (validación empírica)

**Tiene**: tab Validación con overlay reproducible, panel de eventos sincronizado (con corrección fps overlay/eventos vía `duracionOriginalSeg`), score de confiabilidad ALTO/MEDIO/BAJO, conteo de personas únicas para comparar contra conteo manual.
**Falta**: no hay forma de exportar los conteos para el análisis comparativo (ni CSV ni PDF); el conteo manual vs sistema deberá hacerse a ojo sobre la UI; no existe en el sistema ningún campo/pantalla para registrar ground truth. La validación será 100% manual y externa al producto — viable pero sin soporte de herramienta.

---

## SECCIÓN 4 — DEUDA TÉCNICA Y RIESGOS PARA LA DEMO

### 4.1 🔴 RIESGO MAYOR: unidades frames vs segundos infladas ~10x

El sistema migró de 1 fps a 10 fps (`PythonOrchestratorService.java:157` pasa `--fps 10`), pero varios cálculos siguen asumiendo "1 frame = 1 segundo":

| Lugar | Problema |
|---|---|
| `Producto/python/src/metricas_tracking.py:17-26` | `calcular_tiempo_permanencia_promedio(df, fps=1)` — `detector.py:198,208` la llama **sin pasar fps** → devuelve frames etiquetados como segundos |
| `metricas_tracking.py:103-111` | `calcular_ots_tracking()` = suma de frames, documentado como OTS (persona-segundos) |
| `MetricasCalculatorService.java:124` | `ots_tracking = SUM(filas)` — cuenta filas de DETECCIONES (10 por segundo de presencia) |
| `MetricasCalculatorService.java:78-79` | `tiempoPermanenciaProm = otsTracking / personasUnicas` → **frames por persona mostrados como "segundos"** |
| `TrackingMetricsService.java:104` | `segundosTotal = (double) frames_total` — literal |
| `AnalisisDetallado.jsx:131` | Tooltip: "Cada detección = 1 segundo de presencia humana" — falso a 10 fps |

**Escenario de demo que esto rompe**: un video de 60 segundos mostrará "Permanencia promedio: 250.0 s" y "OTS: 4.800 persona-segundos". Cualquier evaluador que haga la aritmética detecta la inconsistencia al instante. Es además el corazón del fundamento conceptual (OTS) declarado en `CLAUDE.md`.

### 4.2 🔴 Bug de forma de datos en tab Resumen

Detallado en Sección 1, Tab 2: `ResumenEjecutivo.jsx` espera agregados por zona en `/metricas-tracking` pero recibe filas por track. La tab Resumen — la primera con números que verá el público tras Validación — siempre dirá "Tracking no disponible" aunque el banner superior presuma de ByteTrack. **Contradicción visible sin necesidad de bugs en vivo.**

### 4.3 Riesgos operativos en vivo

| Riesgo | Detalle |
|---|---|
| Carga completa de eventos | `VideoValidacion.jsx:68` pide `getEventos(id, 0, 999999)` y `VideoService.obtenerEventos()` parsea **todo el JSON en memoria** en cada request. Video de 15 min a 10 fps con varias personas → decenas de MB. Posible lentitud o spinner largo en demo. |
| Fetch muerto de `/detecciones` | Payload potencialmente enorme descargado al abrir resultados, para nada (Sección 2). |
| Overlay en navegadores | TO-DO.md reconoce que el codec H.264/avc1 no está validado en Safari/iOS. Si la demo es en Mac, probar antes. |
| Videos legacy sin `duracionOriginalSeg` | La corrección de desincronización fps overlay/eventos (`VideoValidacion.jsx:87-94`) depende de `duracionOriginalSeg`; con videos procesados antes de esa migración el panel de eventos vuelve a desfasarse. No demos con videos antiguos. |
| `window.confirm`/`alert` nativos | `VideoValidacion.jsx:166,176` — funcional pero inconsistente con Ant Design; estéticamente pobre en pantalla. |
| Umbrales fijos de la matriz temporal | A 10 fps, "6+ detecciones = rojo" hace que casi toda celda activa sea roja → la matriz pierde poder discriminante en vivo. |

### 4.4 Código muerto / deuda

- Endpoints sin consumidor: `GET /videos/:id/resumen`, `PUT /videos/:id/analisis`, `GET/PUT /recintos/:id/zonas`, `GET /videos/:id` (Sección 2.2).
- Props muertas: `metricasTracking` y `zones` en `MetricasTrackingPanel.jsx:6`; `detecciones` en `AnalisisDetallado.jsx:76`.
- `ESTADO_PROYECTO.md` referenciado en `CLAUDE.md` raíz y no existe (hay `TO-DO.md`).
- CSVs de prueba commiteados en `Producto/python/` (`resultado_*.csv`, `test_*.csv`) — ruido en el repo entregable.
- La estructura real del frontend no coincide con `Producto/frontend/CLAUDE.md` (describe `pages/app/`, `components/dashboard/HeatmapEspacial.jsx`, hooks `useMetricas`, etc. que no existen). Documentación desactualizada de cara a la revisión académica.
- Tests pendientes reconocidos en `TO-DO.md` (AuthService, CalculadoraMetricasService, metricas_tracking parcial).

### 4.5 Inconsistencias de discurso (terminología)

| Dónde | Dice | Realidad |
|---|---|---|
| `ResultadosPage.jsx:117` (banner) | "Las métricas principales son personas únicas…" | La tab Resumen muestra persona-segundos (bug 4.2) |
| `AnalisisDetallado.jsx:131` | "Cada detección = 1 segundo" | A 10 fps es 0.1 s |
| `MetricasTrackingPanel.jsx:90` | "Personas únicas totales — sin doble conteo" | La suma por zona sí doble-cuenta cross-zona (admitido en `ResumenEjecutivo.jsx:15`) |
| `RecomendacionPrecio.jsx:19` | "alta permanencia" | Evalúa tasa de detención, no permanencia de tracking |
| `AnalisisDetallado.jsx:270` | Heatmap de "tráfico" | Escala por personas únicas; los rankings de la misma tab usan detecciones |
| Tab Validación vs tab Flujo | "Personas únicas" | Dos fuentes distintas (eventos ENTRADA client-side vs SQL `COUNT(DISTINCT track_id)`) que pueden diferir |

### 4.6 Priorización sugerida pre-demo

1. **Corregir unidades fps (4.1)** — afecta credibilidad de la métrica central del producto.
2. **Fix de `ResumenEjecutivo` (4.2)** — un cambio de una línea (leer `metricas` en vez de `metricasTracking`) desbloquea toda la tab.
3. **Decidir HU-06 (PDF)**: implementar mínimo viable o retirarla explícitamente del discurso de presentación.
4. Eliminar fetch de `/detecciones` o usarlo para un heatmap real (cumpliría HU-03 al 100%).
5. Unificar terminología persona-segundos / personas únicas con una nota metodológica única.
