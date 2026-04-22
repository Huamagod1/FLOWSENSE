# FlowSense — Detector de flujo peatonal (capa Python)

Script standalone que procesa un video MP4 con YOLOv8n y genera un CSV anónimo
con las detecciones de personas por zona. Es invocado por Spring Boot vía
`ProcessBuilder`; también puede ejecutarse directamente desde la línea de comandos.

---

## Instalación

```bash
# Desde la carpeta Producto/python/
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

> **Advertencia:** `ultralytics` instala PyTorch como dependencia (~1 GB de descarga
> la primera vez). Asegúrate de tener buena conexión antes de ejecutar `pip install`.

> **Primera ejecución:** al correr el detector con YOLO real, `yolov8n.pt` (~6 MB)
> se descarga automáticamente en `modelos/`. Las ejecuciones siguientes usan el
> archivo local y no requieren red.

> **Desarrollo sin YOLO:** usa `--stub` para correr el pipeline completo con
> detecciones ficticias sin instalar PyTorch (solo necesitas `opencv-python-headless`
> y `numpy`).

---

## Cómo ejecutar detector.py (standalone)

### Paso 1 — Crear el JSON de zonas

Crea un archivo, por ejemplo `zonas_prueba.json`, con el siguiente contenido.
Las coordenadas son normalizadas en `[0, 1]` relativas al tamaño del frame:

```json
{
  "id_video": 1,
  "zonas": [
    {"id": 1, "x": 0.0, "y": 0.0, "ancho": 0.5, "alto": 1.0},
    {"id": 2, "x": 0.5, "y": 0.0, "ancho": 0.5, "alto": 1.0}
  ]
}
```

Este ejemplo divide el frame en dos mitades: zona 1 (izquierda) y zona 2 (derecha).

### Paso 2 — Ejecutar el detector

Ejecuta desde la carpeta `Producto/python/` con el video de prueba ubicado en
`/video/p.mp4` en la raíz del repositorio:

```bash
# Con YOLO real (requiere ultralytics instalado; descarga yolov8n.pt en la primera ejecución)
python detector.py \
  --video ../../video/p.mp4 \
  --output resultado.csv \
  --zonas zonas_prueba.json \
  --fps 1 \
  --conf 0.45 \
  --iou 0.7 \
  --imgsz 640

# Con stub (sin PyTorch, útil para desarrollo o CI sin GPU)
python detector.py \
  --video ../../video/p.mp4 \
  --output resultado.csv \
  --zonas zonas_prueba.json \
  --stub
```

### Paso 3 — Verificar la salida

Al terminar, el script imprime en stdout una línea JSON:

```json
{"frames_procesados": 42, "detecciones_totales": 67, "duracion_seg": 3.81, "status": "OK"}
```

Y genera `resultado.csv` con el siguiente formato:

---

## Formato del JSON de zonas (entrada)

```json
{
  "id_video": 42,
  "zonas": [
    {"id": 1, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.4},
    {"id": 2, "x": 0.5, "y": 0.1, "ancho": 0.4, "alto": 0.5}
  ]
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id_video` | int | ID del video en la base de datos |
| `zonas[].id` | int | ID de la zona |
| `zonas[].x` | float [0,1] | Coordenada X del borde izquierdo |
| `zonas[].y` | float [0,1] | Coordenada Y del borde superior |
| `zonas[].ancho` | float [0,1] | Ancho normalizado |
| `zonas[].alto` | float [0,1] | Alto normalizado |

---

## Formato del CSV de salida

```csv
id_video,frame_numero,zona_id,x_centro_norm,y_centro_norm,confianza
42,30,1,0.470000,0.610000,0.8200
42,30,2,0.730000,0.280000,0.9100
42,60,1,0.450000,0.580000,0.7700
```

| Columna | Descripción |
|---|---|
| `id_video` | ID del video (viene del JSON de zonas) |
| `frame_numero` | Número de frame en el video original |
| `zona_id` | ID de la zona donde se detectó la persona |
| `x_centro_norm` | X del centro de la caja, normalizada en [0,1] |
| `y_centro_norm` | Y del centro de la caja, normalizada en [0,1] |
| `confianza` | Score de confianza del modelo (0–1) |

Las detecciones fuera de todas las zonas no se escriben al CSV.

---

## Ejecutar los tests unitarios

```bash
# Desde la carpeta Producto/python/
python -m unittest discover -s tests -v
```

---

## Argumentos CLI completos

| Argumento | Requerido | Default | Descripción |
|---|---|---|---|
| `--video` | sí | — | Ruta al MP4 de entrada |
| `--output` | sí | — | Ruta del CSV a generar |
| `--zonas` | sí | — | Ruta JSON con zonas del recinto |
| `--fps` | no | `1` | Frames por segundo a muestrear |
| `--conf` | no | `0.45` | Umbral de confianza |
| `--iou` | no | `0.7` | Umbral IoU para NMS |
| `--imgsz` | no | `640` | Tamaño de entrada del modelo |
| `--stub` | no | `false` | Usar detecciones ficticias sin cargar YOLO |

---

## Parámetros de detección y rangos recomendados

| Parámetro | Default | Rango útil | Efecto al subir el valor |
|---|---|---|---|
| `--conf` | `0.45` | `0.30 – 0.70` | Menos detecciones, mayor precisión; sube si hay muchos falsos positivos |
| `--iou` | `0.70` | `0.50 – 0.85` | Fusiona cajas más agresivamente; sube si personas cercanas se duplican |
| `--fps` | `1` | `0.5 – 5` | Más frames muestreados por segundo; sube para vídeos con movimiento rápido |
| `--imgsz` | `640` | `320 – 1280` | Mayor resolución, más lento; sube si las personas aparecen pequeñas en el frame |
