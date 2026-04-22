# CLAUDE.md — Capa Python / Visión IA

Este archivo da contexto específico de la capa de visión artificial de FlowSense. Complementa el `CLAUDE.md` raíz. Lee ambos.

## Rol de este módulo

Script Python standalone (`detector.py`) que se ejecuta como subproceso invocado por Spring Boot vía `ProcessBuilder`. Recibe argumentos por CLI, procesa un video MP4 con YOLOv8n, y escribe un CSV anónimo con las detecciones. No tiene acceso a la base de datos; la persistencia la maneja Spring Boot.

## Contrato de invocación

```bash
python detector.py \
  --video /uploads/<uuid>.mp4 \
  --output /results/<uuid>.csv \
  --zonas /zones/<uuid>.json \
  --fps 1 \
  --conf 0.45 \
  --iou 0.7 \
  --imgsz 640
```

### Argumentos

| Argumento | Requerido | Default | Descripción |
|---|---|---|---|
| `--video` | sí | — | Ruta absoluta al MP4 |
| `--output` | sí | — | Ruta del CSV a generar |
| `--zonas` | sí | — | Ruta JSON con las zonas del recinto |
| `--fps` | no | 1 | Frames por segundo a muestrear |
| `--conf` | no | 0.45 | Umbral de confianza |
| `--iou` | no | 0.7 | Umbral IoU para NMS |
| `--imgsz` | no | 640 | Tamaño de entrada del modelo |

### Formato del JSON de zonas

```json
{
  "id_video": 42,
  "zonas": [
    {"id": 1, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.4},
    {"id": 2, "x": 0.5, "y": 0.1, "ancho": 0.4, "alto": 0.5}
  ]
}
```
Todas las coordenadas normalizadas en [0, 1].

### Formato del CSV de salida

```csv
id_video,frame_numero,zona_id,x_centro_norm,y_centro_norm,confianza
42,30,1,0.47,0.61,0.82
42,30,2,0.73,0.28,0.91
42,60,1,0.45,0.58,0.77
```

Separador `,`. Encoding UTF-8. Header obligatorio. Si una detección cae fuera de todas las zonas, se descarta (no se escribe al CSV).

### Resumen por stdout

Al finalizar, el script imprime en stdout una línea JSON que Spring Boot captura:

```json
{"frames_procesados": 900, "detecciones_totales": 1847, "duracion_seg": 245, "status": "OK"}
```

Si hay error, `status: "ERROR"` y `mensaje: "<descripción>"`. Exit code 0 si OK, 1 si error.

## Parámetros de detección por defecto

Estos defaults están calibrados para videos de recintos comerciales con cámara elevada (segundo piso, escaleras). Revisar si las condiciones cambian:

| Parámetro | Valor | Justificación |
|---|---|---|
| `conf` | 0.45 | Balance entre falsos positivos y detecciones perdidas |
| `iou` | 0.7 | Default de YOLO, evita fusionar personas cercanas en pasillos |
| `imgsz` | 640 | Velocidad razonable en CPU, suficiente para personas a media distancia |
| `fps muestreo` | 1 | 1 frame/segundo; video 15 min → 900 frames; procesable en <5 min |
| `classes` | `[0]` | Solo clase 'person' de COCO |
| `model` | `yolov8n.pt` | Modelo nano; sin GPU, CPU suficiente |

Todos los parámetros deben ser **configurables por CLI** para soportar HU-09 (admin ajusta umbral). Nunca hardcodear en el cuerpo del script.

## Filtros obligatorios antes de escribir al CSV

Aplicar estos filtros en orden a cada detección que devuelve YOLO:

1. **Tamaño mínimo de caja**: descartar si `ancho_norm × alto_norm < 0.005` (menos del 0.5% del área del frame). Típicamente son falsos positivos o personas tan lejanas que no aportan a la métrica.
2. **Frame corrupto**: si `frame is None` o `frame.mean() < 5` (frame en negro), saltar el frame entero.
3. **Punto de referencia**: usar centro de la caja (`x_centro_norm`, `y_centro_norm`) como punto representativo. Documentar en el código que con cámara oblicua podría convenir usar el punto medio del borde inferior (pies).
4. **Asignación a zona**: si el punto cae dentro del rectángulo de alguna zona, asignar su `id`. Si cae fuera de todas las zonas, **descartar** la detección (no se escribe al CSV).

## Punto de referencia de la detección

Para asignar una detección a una zona se usa el **centro de la caja** por defecto. La lógica es:

```python
def punto_en_zona(x, y, zona):
    return (zona["x"] <= x <= zona["x"] + zona["ancho"] and
            zona["y"] <= y <= zona["y"] + zona["alto"])
```

Si una detección cae dentro de varias zonas superpuestas, asignar a la **primera en orden de ID** (la más antigua). El admin debería evitar superposiciones al definir zonas.

## Performance target

- Video MP4 de 15 minutos (≈900 frames muestreados a 1 fps) debe procesarse en **menos de 5 minutos** en CPU.
- El modelo se carga **una sola vez** antes del bucle de frames. Cargarlo dentro del bucle mata el rendimiento.
- `verbose=False` en `model.predict()` para no llenar stdout con logs de YOLO.

## Restricciones éticas aplicadas a este módulo

Son críticas porque este es el único módulo que toca pixeles de personas:

- **Nunca** usar `cv2.imwrite()` sobre un frame con personas detectadas.
- **Nunca** guardar el video de entrada en una carpeta que no sea la de uploads controlada por Spring Boot.
- **Nunca** extraer features faciales, color de ropa, altura estimada u otros atributos que puedan identificar personas.
- El CSV de salida **solo** contiene: `id_video, frame_numero, zona_id, x_centro_norm, y_centro_norm, confianza`. Cualquier campo adicional requiere revisión ética explícita.
- Los frames leídos por OpenCV deben mantenerse solo en variables locales del bucle. No se guardan en listas acumulativas.

## Manejo de errores

- Video no existe o corrupto → exit 1, mensaje en JSON stdout.
- YOLOv8 no puede cargar el modelo → exit 1.
- JSON de zonas mal formateado → exit 1, mensaje descriptivo.
- Error inesperado → exit 1, traceback completo a stderr, JSON resumen a stdout con `status: "ERROR"`.

## Dependencias (requirements.txt)

Versiones exactas fijadas para reproducibilidad. Usar entorno virtual:

```txt
ultralytics==8.3.*
opencv-python-headless==4.10.*
numpy==1.26.*
```

`opencv-python-headless` (no `opencv-python`) porque no se necesita GUI en el contenedor Docker.

## Estructura del módulo

```
Producto/python/
├── CLAUDE.md              ← este archivo
├── README.md              ← cómo correr detector.py standalone
├── requirements.txt
├── detector.py            ← script principal
├── src/
│   ├── __init__.py
│   ├── cli.py             ← parsing de argumentos
│   ├── detector_core.py   ← lógica de detección YOLO
│   ├── zonas.py           ← asignación de puntos a zonas
│   ├── filtros.py         ← filtros de tamaño, frame corrupto
│   └── output.py          ← escritura CSV y JSON resumen
├── tests/
│   └── test_zonas.py      ← tests unitarios de lógica pura (sin YOLO)
└── modelos/               ← yolov8n.pt se descarga acá la primera vez
    └── .gitkeep
```

El modelo `yolov8n.pt` **no** se versiona en Git. Se descarga automáticamente por ultralytics la primera vez que se invoca. Añadir `modelos/*.pt` al `.gitignore`.

## Tests mínimos esperados

- `test_zonas.py`: punto dentro/fuera/borde de una zona, múltiples zonas, punto en superposición.
- `test_filtros.py`: tamaños de caja válidos e inválidos.
- `test_cli.py`: parsing correcto de argumentos.

Tests de integración con YOLO real no son requeridos para Sprint 2. Basta con los tests unitarios de lógica pura.

## Lo que Claude Code NO debe hacer en este módulo

- No proponer usar `deep-sort` o `bytetrack` para tracking. No está en alcance del MVP.
- No proponer guardar frames procesados como imágenes para debug. Usar logs textuales.
- No proponer extraer embeddings faciales, landmarks, o cualquier feature biométrico.
- No mezclar la lógica de Python con acceso directo a MySQL. El contrato es CSV + stdout.
- No usar `opencv-python` (versión con GUI) en lugar de `opencv-python-headless`.
