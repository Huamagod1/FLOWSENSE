# CLAUDE.md — Capa Python / Visión IA

Este archivo da contexto específico de la capa de visión artificial. Complementa el `CLAUDE.md` raíz.

## Rol del módulo

Script Python standalone (`detector.py`) ejecutado como subproceso desde Spring Boot vía `ProcessBuilder`. Tiene dos modos de operación:

1. **Modo detectar** (default): procesa video completo con YOLOv8, escribe CSV anónimo con detecciones
2. **Modo extraer-frame**: extrae un frame representativo del video como PNG (rápido, ~2 segundos)

No tiene acceso a base de datos. Toda la persistencia la maneja Spring Boot.

## Versión de Python

Usar **Python 3.12** específicamente. Razón: compatibilidad con wheels precompilados de numpy 1.26 y ultralytics 8.3. Python 3.13+ causa errores de compilación.

## Contrato de invocación

### Modo detectar (operación principal)

```bash
python detector.py \
  --modo detectar \
  --video /uploads/<uuid>.mp4 \
  --output /results/<uuid>.csv \
  --zonas /zones/<uuid>.json \
  --fps 1 \
  --conf 0.45 \
  --iou 0.7 \
  --imgsz 640 \
  --modelo yolov8n
```

### Modo extraer-frame (preparación del editor de zonas)

```bash
python detector.py \
  --modo extraer-frame \
  --video /uploads/<uuid>.mp4 \
  --frame-output /frames/<uuid>.png \
  --frame-segundo 5
```

## Argumentos CLI completos

| Argumento | Modo | Required | Default | Descripción |
|-----------|------|----------|---------|-------------|
| `--modo` | ambos | no | `detectar` | `detectar` o `extraer-frame` |
| `--video` | ambos | sí | — | Ruta absoluta al MP4 |
| `--output` | detectar | sí | — | Ruta del CSV a generar |
| `--zonas` | detectar | sí | — | Ruta JSON con zonas |
| `--fps` | detectar | no | 1 | Frames por segundo a muestrear |
| `--conf` | detectar | no | 0.45 | Umbral de confianza |
| `--iou` | detectar | no | 0.7 | Umbral IoU para NMS |
| `--imgsz` | detectar | no | 640 | Tamaño de entrada del modelo |
| `--modelo` | detectar | no | `yolov8n` | `yolov8n`, `yolov8s`, `yolov8m` |
| `--max-det` | detectar | no | 300 | Máximo de detecciones por frame |
| `--stub` | detectar | no | False | Usar stub dummy en lugar de YOLO |
| `--tracker` | detectar | no | `bytetrack` | Motor de tracking: `bytetrack` o `none` |
| `--preview` | detectar | no | False | Ventana OpenCV en vivo |
| `--frame-output` | extraer-frame | sí (en su modo) | — | Ruta del PNG a guardar |
| `--frame-segundo` | extraer-frame | no | 5 | Segundo del video a extraer |

## Formato de archivos

### JSON de zonas (entrada en modo detectar)

```json
{
  "id_video": 42,
  "zonas": [
    {"id": 1, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.4},
    {"id": 2, "x": 0.5, "y": 0.1, "ancho": 0.4, "alto": 0.5}
  ]
}
```

Coordenadas normalizadas entre 0 y 1. El parser usa `utf-8-sig` para tolerar BOM (común en archivos generados desde Windows).

### CSV de salida (en modo detectar)

```csv
id_video,frame_numero,zona_id,track_id,x_centro_norm,y_centro_norm,confianza,detenida
42,30,1,1,0.47,0.61,0.82,false
42,30,2,2,0.73,0.28,0.91,false
42,60,1,1,0.45,0.58,0.77,true
```

Columnas:
- `id_video`: ID del video desde el JSON
- `frame_numero`: número del frame procesado
- `zona_id`: ID de la zona donde cae el centro de la detección
- `track_id`: ID de track asignado por ByteTrack (entero ≥ 1); -1 si el tracker no asignó ID (compat. hacia atrás)
- `x_centro_norm`, `y_centro_norm`: coordenadas normalizadas del centro de la caja
- `confianza`: confianza de YOLO entre 0 y 1
- `detenida`: `true` si la detección aparece quieta en el frame siguiente

Si una detección cae fuera de todas las zonas, se descarta (no se escribe).

### JSON de resumen por stdout (modo detectar)

```json
{
  "frames_procesados": 900,
  "detecciones_totales": 1847,
  "detecciones_detenidas": 645,
  "tasa_detencion_global": 0.349,
  "duracion_seg": 245,
  "modelo_usado": "yolov8n",
  "personas_unicas_total": 234,
  "tiempo_permanencia_promedio_global": 18.4,
  "flujo_entre_zonas": [
    {"zona_origen": 1, "zona_destino": 2, "conteo": 87}
  ],
  "metricas_por_zona": {
    "1": {
      "personas_unicas": 120,
      "tiempo_permanencia_promedio": 22.1,
      "entradas": 125,
      "salidas": 118,
      "ots_tracking": 2652,
      "velocidad_flujo_promedio": 0.034
    }
  },
  "status": "OK"
}
```

Los campos de tracking son opcionales en el JSON: si `--tracker none`, no aparecen. Spring Boot lee ambos formatos sin error.

### JSON de resumen modo extraer-frame

```json
{
  "frame_extraido": true,
  "ruta": "/frames/uuid.png",
  "ancho": 1920,
  "alto": 1080,
  "duracion_seg": 1.8,
  "status": "OK"
}
```

## Métrica de detención (cómo se calcula)

Después de procesar todas las detecciones del video, se hace una pasada final que compara frames consecutivos:

```
Para cada par (frame_t, frame_t+1) muestreados:
    Para cada deteccion en frame_t:
        Buscar deteccion en frame_t+1 con coordenadas similares
        Si distance(det_t, det_t+1) < 0.05 (5% del frame):
            Marcar det_t como "detenida"
```

El umbral 0.05 normalizado equivale a "menos del 5% del frame de movimiento entre frames consecutivos". Si una persona se movió menos de eso en 1 segundo (con `--fps 1`), se considera detenida.

Esta métrica se incluye en el CSV (columna `detenida`) y se agrega al JSON de resumen como `tasa_detencion_global`.

## Filtros obligatorios antes de escribir al CSV

Aplicar en orden:

1. **Frame válido**: si `frame is None` o `frame.mean() < 5`, saltar.
2. **Tamaño mínimo de caja**: descartar si `ancho_norm × alto_norm < 0.005`.
3. **Punto de referencia**: usar centro de la caja `(x_centro_norm, y_centro_norm)`.
4. **Asignación a zona**: si el centro cae dentro de alguna zona, asignar su ID. Si cae fuera de todas, descartar.
5. **Cálculo de detención** (post-procesamiento): comparar con frame siguiente.

## Modelos YOLOv8 soportados

| Modelo | Tamaño | Velocidad CPU | Cuándo usar |
|--------|--------|---------------|-------------|
| yolov8n | 6 MB | ~0.6s/frame | Default, pruebas, demos rápidas |
| yolov8s | 22 MB | ~1.5s/frame | Recintos típicos (recomendado para producción) |
| yolov8m | 52 MB | ~3.5s/frame | Escenas densas (ferias, malls llenos) |

El modelo se carga **una sola vez** al instanciar la clase `Detector`, no dentro del bucle. Se descarga automáticamente la primera vez en `Producto/python/modelos/`.

## Estructura del módulo

```
Producto/python/
├── CLAUDE.md
├── README.md
├── requirements.txt
├── Dockerfile
├── detector.py                  ← orquestador principal
├── src/
│   ├── __init__.py
│   ├── cli.py                   ← parsing de argumentos
│   ├── detector_core.py         ← clase Detector con YOLOv8 real
│   ├── detector_stub.py         ← clase Detector con datos dummy
│   ├── extractor_frame.py       ← lógica del modo extraer-frame
│   ├── zonas.py                 ← cargar_zonas, asignar_zona
│   ├── filtros.py               ← caja_valida, frame_valido
│   ├── deteccion_movimiento.py  ← cálculo de tasa de detención
│   ├── tracker.py               ← wrapper ByteTrack (model.track con persist=True)
│   ├── metricas_tracking.py     ← funciones puras sobre DataFrame del CSV
│   ├── output.py                ← escritura CSV y JSON resumen
│   └── preview.py               ← ventana OpenCV en vivo
├── tests/
│   ├── test_zonas.py
│   ├── test_carga_zonas.py
│   ├── test_deteccion_movimiento.py
│   └── test_metricas_tracking.py
└── modelos/
    └── .gitkeep                 ← yolov8*.pt se descargan acá
```

## Restricciones éticas aplicadas

Críticas porque este módulo toca pixeles de personas:

- **Nunca** usar `cv2.imwrite()` sobre frames con personas detectadas (excepción: modo extraer-frame, único caso donde se guarda imagen, y solo del segundo 5)
- **Nunca** guardar el video de entrada fuera de la carpeta de uploads controlada por Spring Boot
- **Nunca** extraer features faciales, color de ropa, altura estimada, edad, género
- El CSV solo contiene las columnas especificadas. Cualquier campo adicional requiere revisión ética
- Frames leídos por OpenCV en variables locales del bucle, nunca en listas acumulativas

## Performance target

- Video MP4 de 15 minutos (~900 frames muestreados a 1 fps) procesarse en menos de 30 minutos en CPU con yolov8s
- Modelo cargado una sola vez antes del bucle
- `verbose=False` en `model.predict()` para evitar saturar stdout

## Manejo de errores

- Video no existe o corrupto → exit 1, JSON con `status: "ERROR"`
- YOLOv8 no carga modelo → exit 1
- JSON de zonas mal formateado → exit 1, mensaje descriptivo
- Error inesperado → exit 1, traceback a stderr, JSON resumen a stdout

## Dependencias (requirements.txt)

```
ultralytics==8.3.*
opencv-python-headless==4.10.*
numpy==1.26.*
```

`opencv-python-headless` (no `opencv-python`) porque no se necesita GUI en Docker. Sin embargo, ultralytics instala `opencv-python` como dependencia transitiva, lo que permite usar `cv2.imshow` en el modo `--preview` localmente.

## Tests mínimos esperados

- `test_zonas.py`: punto dentro/fuera/borde, múltiples zonas, superposición
- `test_carga_zonas.py`: JSON con y sin BOM
- `test_filtros.py`: tamaños válidos e inválidos
- `test_deteccion_movimiento.py`: detenida/movida/borde

Tests de integración con YOLO real no son requeridos.

## Modos --stub y --preview

### --stub
Usa `detector_stub.py` en lugar de `detector_core.py`. Genera detecciones dummy sin cargar YOLO. Útil para desarrollar sin instalar PyTorch (~1 GB).

### --preview
Abre ventana OpenCV con bounding boxes en vivo. Solo funciona localmente (no en Docker). Controles:
- Espacio: pausar/reanudar
- 'q' o ESC: abortar (cierra CSV con lo procesado, marca `aborted_by_user: true`)

## Troubleshooting común

| Problema | Causa | Solución |
|----------|-------|----------|
| numpy no instala | Python 3.13+ no tiene wheels para numpy 1.26 | Usar Python 3.12 |
| BOM en JSON | PowerShell Out-File agrega BOM | cargar_zonas usa utf-8-sig (ya implementado) |
| Video no encontrado | Rutas relativas mal calculadas | Usar rutas absolutas o `..\..\video\` desde `Producto/python/` |
| ExecutionPolicy en venv | PowerShell bloquea scripts | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Ruta con espacios | "Proyecto duoc" tiene espacio | Encerrar en comillas o renombrar a sin espacios |

## Lo que Claude Code NO debe hacer en este módulo

- No guardar frames como imágenes para debug (excepto modo extraer-frame)
- No extraer embeddings faciales o features biométricos
- No mezclar lógica con acceso directo a MySQL
- No usar `opencv-python` en lugar de `opencv-python-headless` en requirements.txt
- No agregar campos al CSV sin revisión ética explícita
