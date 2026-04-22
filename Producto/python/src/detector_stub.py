import random


class Detector:
    """Stub intercambiable con detector_core.Detector. No requiere ultralytics."""

    def __init__(self, conf, iou, imgsz):
        pass

    def detectar_frame(self, frame):
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
