import random


class Detector:
    """Stub intercambiable con detector_core.Detector. No requiere ultralytics."""

    def __init__(self, conf, iou, imgsz, modelo="yolov8n", tracker="bytetrack"):
        self._use_tracker = tracker != "none"
        self._tracks: dict = {}   # track_id -> {x, y, w, h, frames_restantes}
        self._next_id = 1

    def detectar_frame(self, frame, max_det=300):
        if not self._use_tracker:
            return self._detectar_sin_tracking(max_det)
        return self._detectar_con_tracking(max_det)

    # ── helpers ──────────────────────────────────────────────────────────────

    def _detectar_sin_tracking(self, max_det):
        n = random.randint(1, 3)
        resultado = []
        for _ in range(n):
            resultado.append({
                "track_id": -1,
                "x_centro_norm": random.uniform(0.05, 0.95),
                "y_centro_norm": random.uniform(0.05, 0.95),
                "ancho_norm": random.uniform(0.04, 0.15),
                "alto_norm": random.uniform(0.05, 0.18),
                "confianza": round(random.uniform(0.45, 0.99), 4),
            })
        return resultado

    def _detectar_con_tracking(self, max_det):
        # Envejecer tracks; eliminar los que expiraron
        expirados = [tid for tid, t in self._tracks.items() if t["frames_restantes"] <= 0]
        for tid in expirados:
            del self._tracks[tid]
        for t in self._tracks.values():
            t["frames_restantes"] -= 1

        # Aparición de nuevos tracks con probabilidad baja
        if random.random() < 0.4 and len(self._tracks) < max_det:
            for _ in range(random.randint(1, 2)):
                if len(self._tracks) >= max_det:
                    break
                tid = self._next_id
                self._next_id += 1
                self._tracks[tid] = {
                    "x": random.uniform(0.05, 0.95),
                    "y": random.uniform(0.05, 0.95),
                    "w": random.uniform(0.04, 0.15),
                    "h": random.uniform(0.05, 0.18),
                    "frames_restantes": random.randint(3, 10),
                }

        resultado = []
        for tid, t in list(self._tracks.items()):
            # Pequeño desplazamiento por frame para simular movimiento
            t["x"] = max(0.05, min(0.95, t["x"] + random.uniform(-0.02, 0.02)))
            t["y"] = max(0.05, min(0.95, t["y"] + random.uniform(-0.02, 0.02)))
            resultado.append({
                "track_id": tid,
                "x_centro_norm": t["x"],
                "y_centro_norm": t["y"],
                "ancho_norm": t["w"],
                "alto_norm": t["h"],
                "confianza": round(random.uniform(0.45, 0.99), 4),
            })
        return resultado
