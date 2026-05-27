"""
diagnostico_yolo.py — script temporal de diagnóstico

Ejecuta YOLOv8 sobre el video del análisis 9 SIN filtrar por zonas.
Muestra TODAS las detecciones por frame para comparar contra las que
quedaron registradas en BD (solo dentro de zonas).

Uso:
    python scripts/diagnostico_yolo.py

No toca la BD ni escribe archivos permanentes.
"""

import sys
from pathlib import Path

# Asegurar que el root del módulo esté en el path
sys.path.insert(0, str(Path(__file__).parent.parent))

import cv2
from ultralytics import YOLO

# ── Configuración ──────────────────────────────────────────────────────────────
VIDEO = Path(__file__).parent.parent / "uploads" / "video9_diag.mp4"
MODELO = Path(__file__).parent.parent / "modelos" / "yolov8n.pt"
FPS_MUESTREO = 1          # 1 frame por segundo, igual que el detector real
CONF_UMBRAL  = 0.45       # mismo umbral que producción
IOU_UMBRAL   = 0.70
IMGSZ        = 640

# Zonas del análisis 9 (de la BD: id, x_norm, y_norm, ancho_norm, alto_norm)
ZONAS = [
    {"id": 31, "nombre": "Zona 3", "x": 0.0074, "y": 0.0087, "w": 0.3332, "h": 0.9684},
    {"id": 32, "nombre": "Zona 4", "x": 0.6390, "y": 0.0018, "w": 0.3550, "h": 0.9800},
]

def en_zona(cx: float, cy: float, z: dict) -> bool:
    return (z["x"] <= cx <= z["x"] + z["w"]) and (z["y"] <= cy <= z["y"] + z["h"])

def zona_para(cx: float, cy: float) -> str:
    for z in ZONAS:
        if en_zona(cx, cy, z):
            return f"Z{z['id']}({z['nombre']})"
    return "FUERA"

def x_sector(cx: float) -> str:
    if cx < 0.34:
        return "izq"
    if cx < 0.64:
        return "CENTRO(gap)"
    return "der"

# ── Carga modelo ───────────────────────────────────────────────────────────────
print(f"\n{'='*70}")
print(f"DIAGNÓSTICO YOLO — Video análisis ID 9")
print(f"Video : {VIDEO}")
print(f"Modelo: {MODELO}")
print(f"{'='*70}")
print()

if not VIDEO.exists():
    print(f"ERROR: video no encontrado en {VIDEO}")
    print("Ejecuta primero: docker cp flowsense-backend:/app/uploads/5/<uuid>.mp4 uploads/video9_diag.mp4")
    sys.exit(1)

model = YOLO(str(MODELO))

cap = cv2.VideoCapture(str(VIDEO))
fps_real   = cap.get(cv2.CAP_PROP_FPS) or 25.0
total_orig = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
step       = max(1, int(fps_real / FPS_MUESTREO))

print(f"FPS del video : {fps_real:.1f}")
print(f"Frames totales: {total_orig}")
print(f"Step de muestreo (1 det / seg): cada {step} frames")
print(f"Frames que se analizarán: ~{total_orig // step}")
print()

# Rangos de zona para referencia rápida
for z in ZONAS:
    print(f"  {z['nombre']} (id={z['id']}): x [{z['x']:.3f} – {z['x']+z['w']:.3f}]  "
          f"y [{z['y']:.3f} – {z['y']+z['h']:.3f}]")
print(f"  GAP central sin zona   : x [0.340 – 0.639]  (~30% del frame)")
print()
print(f"{'Frame':>6}  {'Seg':>5}  {'#YOLO':>5}  {'#ZIzq':>5}  {'#ZDer':>5}  {'#Fuera':>6}  Detalle")
print("-" * 80)

# ── Acumuladores globales ──────────────────────────────────────────────────────
total_yolo  = 0
total_izq   = 0
total_der   = 0
total_fuera = 0
xs_fuera    = []   # coordenadas X de detecciones fuera de zonas

frame_num = 0
frames_analizados = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if frame_num % step != 0:
        frame_num += 1
        continue

    h_px, w_px = frame.shape[:2]
    segundo = frame_num / fps_real

    results = model.predict(
        frame,
        conf=CONF_UMBRAL,
        iou=IOU_UMBRAL,
        imgsz=IMGSZ,
        classes=[0],       # solo personas
        verbose=False,
    )

    dets = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cx = ((x1 + x2) / 2) / w_px
            cy = ((y1 + y2) / 2) / h_px
            conf = float(box.conf[0])
            dets.append((cx, cy, conf))

    n_yolo  = len(dets)
    n_izq   = sum(1 for d in dets if zona_para(d[0], d[1]).startswith("Z31"))
    n_der   = sum(1 for d in dets if zona_para(d[0], d[1]).startswith("Z32"))
    n_fuera = n_yolo - n_izq - n_der

    total_yolo  += n_yolo
    total_izq   += n_izq
    total_der   += n_der
    total_fuera += n_fuera

    detalle_parts = []
    for cx, cy, conf in dets:
        sector = x_sector(cx)
        zona   = zona_para(cx, cy)
        detalle_parts.append(f"x={cx:.3f}[{sector},{zona},c={conf:.2f}]")
        if zona == "FUERA":
            xs_fuera.append(cx)

    detalle = "  ".join(detalle_parts) if detalle_parts else "—"

    print(f"{frame_num:>6}  {segundo:>5.1f}s  {n_yolo:>5}  {n_izq:>5}  {n_der:>5}  {n_fuera:>6}  {detalle}")

    frame_num += 1
    frames_analizados += 1

cap.release()

# ── Resumen ────────────────────────────────────────────────────────────────────
print()
print("=" * 70)
print("RESUMEN GLOBAL")
print("=" * 70)
print(f"Frames analizados    : {frames_analizados}")
print(f"Total detecciones YOLO (sin filtrar)  : {total_yolo}")
print(f"  → cayeron en Zona izq (Z31)         : {total_izq}  ({100*total_izq/max(1,total_yolo):.0f}%)")
print(f"  → cayeron en Zona der (Z32)         : {total_der}  ({100*total_der/max(1,total_yolo):.0f}%)")
print(f"  → cayeron FUERA de ambas zonas      : {total_fuera}  ({100*total_fuera/max(1,total_yolo):.0f}%)")
print()

if xs_fuera:
    izq_gap = sum(1 for x in xs_fuera if x < 0.34)
    centro  = sum(1 for x in xs_fuera if 0.34 <= x < 0.64)
    der_gap = sum(1 for x in xs_fuera if x >= 0.64)
    print(f"Detecciones FUERA desglosadas por x:")
    print(f"  x < 0.340  (fuera de Z31 por la izquierda): {izq_gap}")
    print(f"  x 0.34–0.64 (gap central sin zona)        : {centro}")
    print(f"  x > 0.640  (fuera de Z32 por la derecha)  : {der_gap}")
    print()
    print("DIAGNÓSTICO:")
    if centro > total_yolo * 0.25:
        print("  ► CAUSA PROBABLE: gap central sin zona (~30% del frame sin cubrir).")
        print("    YOLO detecta personas en el centro pero quedan fuera de ambas zonas.")
        print("    SOLUCIÓN: ampliar Z31 hacia la derecha o Z32 hacia la izquierda.")
    elif total_izq < total_der * 0.5:
        print("  ► CAUSA PROBABLE: YOLO no detecta bien en la zona izquierda.")
        print("    Revisar iluminación/ángulo del lado izquierdo del frame.")
    else:
        print("  ► Distribución razonablemente simétrica. Revisar manualmente.")
else:
    print("No hubo detecciones fuera de zonas.")
    print("DIAGNÓSTICO: YOLO solo detecta personas dentro de las zonas definidas.")
    print("La asimetría es real: genuinamente hay más tráfico en la zona derecha.")
