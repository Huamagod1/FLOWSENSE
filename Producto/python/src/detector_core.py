# STUB — reemplazar con YOLO real en HU-01
# La firma de detectar_frame debe mantenerse igual al integrar ultralytics.
# Añadir verbose=False en model.predict() para no contaminar stdout con logs de YOLO.
import random


def detectar_frame(frame, conf, iou, imgsz):
    """
    Devuelve lista de detecciones ficticias para probar el pipeline sin ultralytics.
    Cada detección es un dict con las claves que usa detector.py.
    """
    n = random.randint(1, 3)
    detecciones = []
    for _ in range(n):
        ancho = random.uniform(0.04, 0.15)
        alto = random.uniform(0.05, 0.18)
        detecciones.append({
            "x_centro_norm": random.uniform(0.05, 0.95),
            "y_centro_norm": random.uniform(0.05, 0.95),
            "ancho_norm": ancho,
            "alto_norm": alto,
            "confianza": round(random.uniform(0.45, 0.99), 4),
        })
    return detecciones
