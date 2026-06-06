# MÓDULO 2 — Capa Python / YOLOv8 (Detección)

> Estudio del módulo de visión artificial de FlowSense.
> Archivos base: `Producto/python/`

---

## 1. Punto de entrada — `detector.py`

**Archivo:** `Producto/python/detector.py`

Es el orquestador principal. Spring Boot lo invoca como subproceso con `ProcessBuilder`. Su trabajo es leer los argumentos CLI, decidir qué modo ejecutar, y coordinar el flujo completo.

### Los dos modos de operación

```
python detector.py --modo extraer-frame ...   → extrae un PNG del segundo 5
python detector.py --modo detectar ...        → procesa todo el video con YOLO
```

### Flujo interno en modo detectar (resumido)

```
1. parsear_args()             → lee argumentos CLI
2. cargar_zonas()             → valida JSON de zonas
3. Detector(...)              → carga YOLO una sola vez (¡fuera del bucle!)
4. cv2.VideoCapture(video)    → abre el video
5. BUCLE por frames:
   a. frame_step: saltear frames para respetar --fps
   b. frame_valido(frame)     → descartar frames corruptos/negros
   c. detector.detectar_frame(frame)  → YOLO + ByteTrack
   d. caja_valida(ancho, alto)       → filtrar cajas muy pequeñas
   e. asignar_zona(x, y, zonas)      → descartar si cae fuera de todas
   f. acumular en todas_detecciones[]
6. POST-BUCLE:
   a. calcular_detenidas()    → compara frames consecutivos
   b. escribir CSV completo
   c. calcular métricas de tracking (con pandas DataFrame)
   d. generar video overlay MP4
   e. imprimir_resumen() → JSON a stdout (Spring Boot lo captura)
```

### Por qué todas las detecciones se acumulan en memoria antes de escribir el CSV

La columna `detenida` requiere comparar dos frames consecutivos: para saber si la persona en el frame 100 está quieta, necesitas ver dónde está en el frame 110. No puedes saberlo mientras procesas el frame 100. Por eso se acumula todo en `todas_detecciones[]` y se hace un post-procesamiento al final.

### Manejo de errores

El bloque `try/except` del `if __name__ == "__main__"` garantiza que **siempre** se imprima un JSON con `status: ERROR` aunque haya una excepción inesperada. Spring Boot necesita ese JSON para saber que el proceso falló.

```python
if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)
```

---

## 2. Argumentos CLI — `src/cli.py`

**Archivo:** `Producto/python/src/cli.py`

Define todos los argumentos con `argparse`. Importante conocer los valores por defecto:

| Argumento | Default | Notas |
|-----------|---------|-------|
| `--modo` | `detectar` | `detectar` o `extraer-frame` |
| `--fps` | `10.0` | 10 frames/segundo muestreados |
| `--conf` | `0.45` | Umbral de confianza YOLO |
| `--iou` | `0.7` | Umbral IoU para NMS |
| `--imgsz` | `640` | Tamaño de entrada al modelo |
| `--modelo` | `yolov8n` | Opciones: `yolov8n`, `yolov8s`, `yolov8m` |
| `--max-det` | `300` | Máximo de detecciones por frame |
| `--tracker` | `bytetrack` | Opciones: `bytetrack`, `none` |
| `--stub` | `False` | Si está, usa `detector_stub.py` (sin YOLO) |
| `--preview` | `False` | Si está, abre ventana OpenCV en vivo |
| `--frame-segundo` | `5` | Segundo del video a extraer (modo extraer-frame) |

Los argumentos `--output`, `--zonas` y `--frame-output` son `default=None` en argparse pero se validan programáticamente en `detector.py` (no con `required=True`), para poder dar un mensaje de error JSON consistente en lugar del error por defecto de argparse.

### Por qué --fps es 10 y no 1

ByteTrack necesita continuidad temporal entre frames para asignar `track_id` de manera estable. Con 1 fps, entre frame y frame puede haber demasiado movimiento y el tracker "pierde" a las personas y les asigna un nuevo ID. Con 10 fps, el tracker ve el movimiento gradual y mantiene el mismo `track_id` durante toda la trayectoria. La contrapartida es que genera más datos (10× más filas en el CSV).

---

## 3. Carga del modelo YOLOv8 — `src/detector_core.py`

**Archivo:** `Producto/python/src/detector_core.py`

### Carga una sola vez

```python
class Detector:
    def __init__(self, conf, iou, imgsz, modelo="yolov8n", tracker="bytetrack"):
        modelo_path = _MODELOS_DIR / f"{modelo}.pt"
        self.model = YOLO(str(modelo_path))
        self._tracker = ByteTracker(self.model, conf, iou, imgsz) if tracker != "none" else None
```

`YOLO(modelo_path)` tarda 2-5 segundos y carga ~1 GB de PyTorch a la RAM. Si se llamara dentro del bucle de frames (una vez por frame), el video de 15 minutos tardaría horas. Al cargarlo en `__init__` antes del bucle, solo paga ese costo una vez.

Si el archivo `.pt` no existe en `Producto/python/modelos/`, ultralytics lo descarga automáticamente desde el repositorio oficial de Ultralytics.

### Solo detecta personas

```python
results = self.model.predict(
    frame,
    classes=[0],   # ← clase 0 del dataset COCO = "person"
    ...
)
```

COCO tiene 80 clases (persona, bicicleta, auto, perro, etc.). El parámetro `classes=[0]` filtra solo la clase 0. Sin este filtro, el modelo detectaría cualquier objeto.

### Coordenadas normalizadas con xywhn

```python
xywhn = boxes.xywhn.cpu().numpy()
# xywhn = [x_centro, y_centro, ancho, alto] — todo entre 0 y 1
```

La propiedad `.xywhn` (la `n` es de "normalized") devuelve coordenadas relativas al tamaño del frame. Un valor de `x=0.5` significa "en el centro horizontal", independientemente de si el video es 640×480 o 1920×1080. Esto es fundamental para que las zonas definidas sobre el frame preview funcionen con cualquier resolución.

### Modo sin tracker (fallback)

Si `--tracker none`, no se instancia `ByteTracker` y se llama directamente a `model.predict()`. En este caso `track_id = -1` para todas las detecciones (compatibilidad hacia atrás con videos procesados antes de que se implementara tracking).

---

## 4. ByteTrack — `src/tracker.py`

**Archivo:** `Producto/python/src/tracker.py`

Wrapper sobre la funcionalidad de tracking de ultralytics.

```python
results = self._model.track(
    frame,
    persist=True,          # ← mantiene el estado del tracker entre llamadas
    tracker="bytetrack.yaml",
    classes=[0],
    ...
)
ids = boxes.id.cpu().numpy().astype(int)
```

### Qué hace ByteTrack

ByteTrack (de la librería `lapx`) es un algoritmo de tracking multi-objeto. Por cada frame, asocia cada bounding box detectado con un "track" (trayectoria) existente usando IoU (intersección sobre unión). Le asigna un `track_id` entero positivo (1, 2, 3…) que se mantiene consistente entre frames mientras la persona sea visible.

El parámetro clave es `persist=True`: le dice a ultralytics que mantenga el estado interno del tracker entre frames consecutivos. Sin esto, el tracker se reiniciaría en cada frame y nunca podría asignar IDs consistentes.

### Deteccion dataclass

```python
@dataclass
class Deteccion:
    track_id: int
    x_centro_norm: float
    y_centro_norm: float
    ancho_norm: float
    alto_norm: float
    confianza: float
```

El `ByteTracker.track()` devuelve una lista de instancias `Deteccion`. El `Detector.detectar_frame()` las convierte a diccionarios para uniformar la interfaz con el modo sin tracker.

---

## 5. Zonas — `src/zonas.py`

**Archivo:** `Producto/python/src/zonas.py`

### cargar_zonas()

```python
with open(ruta_json, "r", encoding="utf-8-sig") as f:
    datos = json.load(f)
```

`utf-8-sig` es "UTF-8 con soporte a BOM (Byte Order Mark)". PowerShell en Windows agrega un BOM invisible al inicio de los archivos de texto que genera. Si se usara `utf-8` normal, el primer carácter del JSON sería `﻿{` (con el BOM), lo que causa `JSONDecodeError`. `utf-8-sig` detecta y descarta ese BOM automáticamente.

Valida que el JSON tenga `id_video`, `zonas`, y que cada zona tenga los campos `id`, `x`, `y`, `ancho`, `alto`. Si falla, lanza excepción descriptiva.

### asignar_zona()

```python
def asignar_zona(x, y, zonas):
    for zona in zonas:
        if (zona["x"] <= x <= zona["x"] + zona["ancho"] and
                zona["y"] <= y <= zona["y"] + zona["alto"]):
            return zona["id"]
    return None
```

Recorre la lista de zonas en orden y devuelve el ID de la **primera** que contiene el punto `(x, y)`. Si dos zonas se superponen, gana la que aparece primero en la lista. Si el punto no cae en ninguna zona, devuelve `None` y la detección se descarta (no se escribe en el CSV).

Las coordenadas son normalizadas [0,1] tanto para las zonas como para el punto. El cálculo es un simple "¿está el punto dentro del rectángulo?".

### Formato JSON de entrada

```json
{
  "id_video": 42,
  "zonas": [
    {"id": 1, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.4},
    {"id": 2, "x": 0.5, "y": 0.1, "ancho": 0.4, "alto": 0.5}
  ]
}
```

Este JSON lo genera `PythonOrchestratorService.java` en el backend. El campo `id` es el índice de la zona dentro de la lista (0, 1, 2…), no el ID de base de datos. Spring Boot mantiene el mapeo `índice Python → ID de BD` en `mapaZonas`.

---

## 6. Filtros — `src/filtros.py`

**Archivo:** `Producto/python/src/filtros.py`

Dos funciones de filtrado, simples y puras:

### frame_valido()

```python
def frame_valido(frame):
    if frame is None:
        return False
    return frame.mean() >= 5
```

- `frame is None`: puede pasar si OpenCV no pudo leer el frame (video corrupto, fin del archivo leído prematuramente).
- `frame.mean() >= 5`: la media de todos los píxeles (0–255). Un frame completamente negro tendría `mean() = 0`. Con umbral 5 se filtra cualquier frame casi completamente negro (típicamente frames de transición o fin de video).

### caja_valida()

```python
def caja_valida(ancho_norm, alto_norm):
    return ancho_norm * alto_norm >= 0.005
```

Filtra bounding boxes cuya área sea menor al 0.5% del frame total. Una persona a 50 metros de la cámara ocupa tan poco espacio que la detección es poco confiable y probablemente sea un falso positivo. También filtra artefactos de YOLO que a veces genera cajas de 1×1 píxel.

Ejemplo: en un frame de 640×640, `0.005` equivale a una caja de ~28×28 píxeles.

---

## 7. Detección de movimiento — `src/deteccion_movimiento.py`

**Archivo:** `Producto/python/src/deteccion_movimiento.py`

### calcular_detenidas()

```python
def calcular_detenidas(detecciones, umbral=0.08):
```

Esta función se llama **después** del bucle principal, cuando ya se tienen todas las detecciones del video.

**Algoritmo:**

1. Agrupa las detecciones por `frame_numero`.
2. Ordena los frames.
3. Para cada frame `t`, mira las detecciones del frame `t+1`.
4. Para cada detección en `t`, busca si existe alguna detección en `t+1` dentro de la distancia euclidiana `umbral = 0.08`.
5. Si existe → `detenida = True`. Si no → `detenida = False`.
6. Las detecciones del último frame siempre quedan `detenida = False` (no hay frame siguiente).

```python
def _cerca_de_alguna(det, candidatos, umbral):
    x0, y0 = det["x_centro_norm"], det["y_centro_norm"]
    for c in candidatos:
        dx = x0 - c["x_centro_norm"]
        dy = y0 - c["y_centro_norm"]
        if math.sqrt(dx * dx + dy * dy) < umbral:
            return True
    return False
```

### Umbral 0.08 en práctica

Con coordenadas normalizadas [0,1], un umbral de 0.08 significa "menos del 8% del ancho/alto del frame de movimiento entre dos frames consecutivos". A 10 fps, si una persona se movió menos de eso en 0.1 segundos, se considera detenida.

**Nota importante:** La documentación en `CLAUDE.md` dice `umbral=0.05`, pero el código real usa `umbral=0.08`. El código fuente es la fuente de verdad.

---

## 8. Salida CSV y JSON — `src/output.py`

**Archivo:** `Producto/python/src/output.py`

### CSV de detecciones

```python
_CABECERA = ["id_video", "frame_numero", "zona_id", "track_id",
             "x_centro_norm", "y_centro_norm", "confianza", "detenida"]
```

Ejemplo de fila:
```
42,100,1,7,0.472345,0.613210,0.8742,false
```

- `id_video`: viene del JSON de zonas (no de la DB directamente)
- `frame_numero`: número absoluto del frame en el video original
- `zona_id`: índice de zona asignado (0-based, índice Python, no ID de BD)
- `track_id`: entero ≥ 1 si ByteTrack asignó ID; -1 si no hay tracker
- `x_centro_norm`, `y_centro_norm`: coordenadas del centro de la caja, redondeadas a 6 decimales
- `confianza`: nivel de confianza de YOLO, redondeado a 4 decimales
- `detenida`: `"true"` o `"false"` (string, no booleano Python)

### imprimir_resumen()

```python
print(json.dumps(resumen))
sys.stdout.flush()
```

El `sys.stdout.flush()` es crítico. Spring Boot lee el stdout del proceso Python a través de un `BufferedReader`. Sin flush, el JSON podría quedarse en el buffer interno de Python y Spring Boot nunca lo recibiría (el proceso termina, el buffer se destruye, Spring Boot no lee nada). El flush fuerza que el JSON llegue al pipe inmediatamente.

### JSON de resumen (mínimo garantizado)

```json
{
  "frames_procesados": 9000,
  "detecciones_totales": 18470,
  "detecciones_detenidas": 6450,
  "tasa_detencion_global": 0.349,
  "duracion_seg": 900,
  "modelo_usado": "yolov8s",
  "status": "OK"
}
```

Los campos de tracking (`personas_unicas_total`, `metricas_por_zona`, `flujo_entre_zonas`, etc.) se agregan solo si `--tracker != none` y hay detecciones. Spring Boot lee ambos formatos sin error.

---

## 9. Extracción de frame — `src/extractor_frame.py`

**Archivo:** `Producto/python/src/extractor_frame.py`

Este modo es el más sencillo del módulo: extrae un único frame del video y lo guarda como PNG. Se invoca en el paso 3 del flujo principal (justo después de que el admin sube el video).

```python
def extraer_frame(video_path, output_path, segundo=5):
    cap = cv2.VideoCapture(video_path)
    cap.set(cv2.CAP_PROP_POS_MSEC, segundo * 1000)  # saltar al segundo indicado
    ret, frame = cap.read()
    cap.release()
    
    alto, ancho = frame.shape[:2]
    cv2.imwrite(output_path, frame)  # ← único uso ético de imwrite en todo el módulo
    
    return {
        "frame_extraido": True,
        "ruta": output_path,
        "ancho": ancho,
        "alto": alto,
        "duracion_seg": duracion_video_seg,
        "status": "OK",
    }
```

`CAP_PROP_POS_MSEC` le dice a OpenCV a qué milisegundo del video posicionarse antes de leer. Es más confiable que saltar por número de frame, especialmente en videos con frame rate variable.

### Única excepción ética a la regla de no guardar imágenes

En todo el módulo Python rige la restricción: **nunca usar `cv2.imwrite()` sobre frames con personas detectadas**. Este modo es la única excepción permitida porque:
1. El frame se usa como fondo del editor de zonas (canvas de react-konva)
2. No tiene bounding boxes superpuestos ni datos de seguimiento
3. El segundo 5 del video típicamente muestra el espacio vacío o con muy pocas personas
4. Lo "guarda" Spring Boot en una carpeta controlada, accesible solo para el admin dueño del recinto

---

## 10. Dependencias y Dockerfile

### `requirements.txt`

```
ultralytics==8.3.*         # YOLOv8 + ByteTrack (tracker incluido)
opencv-python-headless==4.10.*  # OpenCV sin GUI (para producción/Docker)
numpy==1.26.*              # Álgebra lineal (requerido por ultralytics)
lapx>=0.5.5                # ByteTrack como librería independiente
pandas>=2.0,<3.0           # DataFrames para métricas de tracking
imageio[ffmpeg]>=2.31.0    # Escritura video overlay H.264
imageio-ffmpeg>=0.4.9      # Backend ffmpeg para imageio
```

Se usa `opencv-python-headless` (sin GUI) para producción/Docker. `ultralytics` instala `opencv-python` como dependencia transitiva, lo que permite usar `cv2.imshow` localmente con `--preview`.

### `Dockerfile` — BUG CONOCIDO

```dockerfile
FROM python:3.11-slim   ← ⚠️ BUG: debería ser python:3.12-slim
```

**El Dockerfile usa Python 3.11 pero el proyecto requiere Python 3.12.**

La razón de la versión específica: `numpy==1.26.*` y `ultralytics==8.3.*` requieren wheels precompilados que existen para Python 3.12 pero no para Python 3.13+. Con Python 3.11 podría funcionar para numpy, pero el requisito oficial del proyecto es 3.12 por garantía de compatibilidad. Este bug hace que la imagen Docker no esté alineada con el entorno de desarrollo documentado.

---

## 11. Estructura completa del módulo

```
Producto/python/
├── detector.py                  ← orquestador principal (punto de entrada)
├── src/
│   ├── cli.py                   ← argumentos CLI con argparse
│   ├── detector_core.py         ← clase Detector real con YOLOv8
│   ├── detector_stub.py         ← clase Detector dummy (sin YOLO)
│   ├── tracker.py               ← wrapper ByteTrack
│   ├── zonas.py                 ← cargar_zonas, asignar_zona
│   ├── filtros.py               ← frame_valido, caja_valida
│   ├── deteccion_movimiento.py  ← calcular_detenidas (post-proceso)
│   ├── output.py                ← escritura CSV y JSON resumen a stdout
│   ├── extractor_frame.py       ← modo extraer-frame
│   ├── metricas_tracking.py     ← funciones puras sobre DataFrame
│   ├── confiabilidad.py         ← score ALTO/MEDIO/BAJO del análisis
│   ├── eventos.py               ← JSON de eventos por track
│   ├── video_overlay.py         ← generación MP4 con trayectorias
│   └── preview.py               ← ventana OpenCV en vivo (--preview)
├── tests/
│   ├── test_zonas.py
│   ├── test_carga_zonas.py
│   ├── test_deteccion_movimiento.py
│   └── test_metricas_tracking.py
├── modelos/
│   └── .gitkeep                 ← yolov8*.pt se descargan acá (no versionados)
├── requirements.txt
└── Dockerfile
```

---

## 12. Restricciones éticas del módulo

Críticas porque este módulo toca píxeles de personas:

- **NUNCA** usar `cv2.imwrite()` sobre frames con personas detectadas (excepción única: `extractor_frame.py`)
- **NUNCA** guardar frames en listas acumulativas (solo variables locales del bucle → se descartan automáticamente)
- **NUNCA** extraer features faciales, color de ropa, altura, edad, género
- El CSV solo contiene las columnas especificadas. Cualquier campo adicional requiere revisión ética
- `track_id` es un entero temporal dentro del video, sin vinculación a identidad real

---

## 13. Flujo completo resumido (diagrama)

```
Spring Boot
    │
    ├─ ProcessBuilder ──► python detector.py --modo extraer-frame
    │                         ├── cv2.VideoCapture(video)
    │                         ├── cap.set(CAP_PROP_POS_MSEC, 5000)
    │                         ├── cap.read() → frame
    │                         └── cv2.imwrite(frame.png) → stdout JSON
    │
    └─ ProcessBuilder ──► python detector.py --modo detectar
                              ├── cargar_zonas(zonas.json)
                              ├── Detector.__init__() → YOLO se carga UNA vez
                              ├── cv2.VideoCapture(video)
                              ├── BUCLE frames (cada frame_step):
                              │     ├── frame_valido?
                              │     ├── detectar_frame() → YOLO + ByteTrack
                              │     ├── caja_valida?
                              │     ├── asignar_zona?
                              │     └── acumular en todas_detecciones[]
                              ├── calcular_detenidas() (post-proceso)
                              ├── escribir CSV
                              ├── calcular métricas tracking (pandas)
                              ├── generar video overlay MP4
                              └── imprimir JSON resumen → stdout
                                         │
                              Spring Boot lee JSON de stdout
```

---

## 14. Preguntas tipo examen

1. **¿Por qué el script acumula todas las detecciones en `todas_detecciones[]` durante el bucle en lugar de escribirlas directamente al CSV?**

2. **El tracker ByteTrack usa `persist=True`. ¿Qué pasaría si se removiera ese parámetro?**

3. **`zonas.py` usa `encoding="utf-8-sig"`. ¿Cuándo es necesario esto y qué problema resuelve específicamente?**

4. **Si un admin define dos zonas que se superponen y una persona está en la zona de superposición, ¿qué `zona_id` se asigna a esa detección? ¿Qué línea de código determina esto?**

5. **El Dockerfile tiene un bug respecto a la versión de Python. ¿Qué versión usa actualmente, cuál debería usar, y qué consecuencia concreta tiene ese error en producción?**
