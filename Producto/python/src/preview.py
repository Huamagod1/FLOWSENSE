import sys

import cv2
import numpy as np

_VENTANA = "FlowSense — Preview"


def _verificar_display():
    try:
        cv2.namedWindow(_VENTANA, cv2.WINDOW_NORMAL)
        test = np.zeros((1, 1, 3), dtype=np.uint8)
        cv2.imshow(_VENTANA, test)
        cv2.waitKey(1)
    except Exception:
        print(
            "Modo preview requiere un entorno con display disponible. "
            "No es compatible con ejecución headless o Docker.",
            file=sys.stderr,
        )
        sys.exit(1)


def _dibujar_zonas(frame, zonas, h, w):
    for zona in zonas:
        x1 = int(zona["x"] * w)
        y1 = int(zona["y"] * h)
        x2 = int((zona["x"] + zona["ancho"]) * w)
        y2 = int((zona["y"] + zona["alto"]) * h)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"Zona {zona['id']}", (x1 + 4, y1 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)


def _dibujar_detecciones(frame, detecciones, h, w):
    for det in detecciones:
        cx = det["x_centro_norm"] * w
        cy = det["y_centro_norm"] * h
        bw = det["ancho_norm"] * w
        bh = det["alto_norm"] * h
        x1 = int(cx - bw / 2)
        y1 = int(cy - bh / 2)
        x2 = int(cx + bw / 2)
        y2 = int(cy + bh / 2)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
        label = f"P {det['confianza']:.2f}"
        cv2.putText(frame, label, (x1, max(y1 - 6, 14)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)


def _color_fps(fps_proc, fps_esperado):
    ratio = fps_proc / fps_esperado if fps_esperado > 0 else 1.0
    if ratio >= 1.0:
        return (0, 255, 0)    # verde — al ritmo o por encima
    if ratio >= 0.5:
        return (0, 255, 255)  # amarillo — por debajo pero aceptable
    return (0, 0, 255)        # rojo — muy por debajo (< 50%)


def _dibujar_info(frame, frame_num, total_det, fps_proc, fps_esperado):
    font = cv2.FONT_HERSHEY_SIMPLEX
    escala = 0.55
    grosor = 1

    texto_base = f"Frame: {frame_num}  Detecciones: {total_det}"
    texto_fps = f"  FPS: {fps_proc:.1f}"
    texto_completo = texto_base + texto_fps

    (tw, th), baseline = cv2.getTextSize(texto_completo, font, escala, grosor)
    pad_x, pad_y = 6, 6
    bg_w = tw + pad_x * 2
    bg_h = th + baseline + pad_y * 2

    # Fondo semitransparente
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (bg_w, bg_h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

    y_texto = pad_y + th

    # Texto base en blanco
    cv2.putText(frame, texto_base, (pad_x, y_texto), font, escala, (255, 255, 255), grosor)

    # Texto FPS en color dinámico, desplazado tras el texto base
    (tw_base, _), _ = cv2.getTextSize(texto_base, font, escala, grosor)
    color_fps = _color_fps(fps_proc, fps_esperado)
    cv2.putText(frame, texto_fps, (pad_x + tw_base, y_texto), font, escala, color_fps, grosor)


class PreviewWindow:
    def __init__(self):
        _verificar_display()
        self._pausado = False

    def mostrar(self, frame, zonas, detecciones, frame_num, total_det, fps_proc, fps_muestreo):
        h, w = frame.shape[:2]
        vis = frame.copy()

        _dibujar_zonas(vis, zonas, h, w)
        _dibujar_detecciones(vis, detecciones, h, w)
        _dibujar_info(vis, frame_num, total_det, fps_proc, fps_muestreo)

        cv2.imshow(_VENTANA, vis)

        espera_ms = max(1, int(1000 / fps_muestreo))

        if self._pausado:
            while True:
                k = cv2.waitKey(50) & 0xFF
                if k == ord(" "):
                    self._pausado = False
                    break
                if k in (ord("q"), 27):
                    return "quit"
        else:
            k = cv2.waitKey(espera_ms) & 0xFF
            if k in (ord("q"), 27):
                return "quit"
            if k == ord(" "):
                self._pausado = True

        return "continue"

    def cerrar(self):
        cv2.destroyAllWindows()
