import json
import os
from collections import defaultdict, deque
from typing import Optional

import cv2

# Paleta cíclica de 20 colores BGR para track_ids
_PALETA = [
    (255,  56,  56), ( 56, 255,  56), ( 56,  56, 255), (255, 255,  56), ( 56, 255, 255),
    (255,  56, 255), (180,  30,  30), ( 30, 180,  30), ( 30,  30, 180), (180, 180,  30),
    ( 30, 180, 180), (180,  30, 180), (255, 140,  30), ( 30, 255, 140), (140,  30, 255),
    (255, 100, 100), (100, 255, 100), (100, 100, 255), (220, 200,  30), ( 30, 200, 220),
]


def _color(track_id: int) -> tuple:
    return (160, 160, 160) if track_id < 0 else _PALETA[track_id % len(_PALETA)]


def _draw_dashed_rect(img, pt1, pt2, color, thickness: int = 2,
                      dash: int = 10, gap: int = 5) -> None:
    """Dibuja un rectángulo con borde discontinuo."""
    x1, y1 = pt1
    x2, y2 = pt2

    def _seg(p1, p2):
        dx, dy = p2[0] - p1[0], p2[1] - p1[1]
        length = max(1, int((dx ** 2 + dy ** 2) ** 0.5))
        step = dash + gap
        for s in range(0, length, step):
            e = min(s + dash, length)
            t0, t1 = s / length, e / length
            cv2.line(img,
                     (int(p1[0] + t0 * dx), int(p1[1] + t0 * dy)),
                     (int(p1[0] + t1 * dx), int(p1[1] + t1 * dy)),
                     color, thickness)

    _seg((x1, y1), (x2, y1))
    _seg((x2, y1), (x2, y2))
    _seg((x2, y2), (x1, y2))
    _seg((x1, y2), (x1, y1))


def _draw_trail(frame, points: list, color: tuple) -> None:
    """Dibuja trayectoria con gradiente de opacidad (más reciente = más opaco)."""
    n = len(points)
    if n < 2:
        return
    for i in range(1, n):
        alpha = i / n
        faded = tuple(int(c * alpha) for c in color)
        thickness = max(1, int(alpha * 3))
        cv2.line(frame, points[i - 1], points[i], faded, thickness)


def generar_video_overlay(
    video_input: str,
    csv_detecciones: str,
    zonas_json: str,
    video_output: str,
    trail_length: int = 15,
) -> dict:
    """
    Genera un MP4 con overlay de zonas, cajas de detección y trayectorias.

    Args:
        video_input: ruta al MP4 original
        csv_detecciones: ruta al CSV de detecciones ya generado
        zonas_json: ruta al JSON de zonas
        video_output: ruta destino del MP4 procesado
        trail_length: cuántos frames atrás dibujar como trayectoria

    Returns:
        dict con frames_procesados, duracion_seg, tamaño_archivo
    """
    import pandas as pd

    df = pd.read_csv(csv_detecciones)

    with open(zonas_json, "r", encoding="utf-8-sig") as f:
        zonas = json.load(f)["zonas"]

    tiene_dims = "ancho_norm" in df.columns and "alto_norm" in df.columns

    dets_por_frame: dict = defaultdict(list)
    for _, row in df.iterrows():
        dets_por_frame[int(row["frame_numero"])].append({
            "track_id": int(row.get("track_id", -1)),
            "x": float(row["x_centro_norm"]),
            "y": float(row["y_centro_norm"]),
            "ancho": float(row["ancho_norm"]) if tiene_dims else 0.06,
            "alto": float(row["alto_norm"]) if tiene_dims else 0.18,
            "confianza": float(row["confianza"]),
        })

    cap = cv2.VideoCapture(video_input)
    if not cap.isOpened():
        raise ValueError(f"No se pudo abrir el video: {video_input}")

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_salida = min(float(fps_video), 24.0)

    # Intentar H.264 (avc1) para compatibilidad HTML5; fallback imageio/libx264
    use_imageio = False
    writer = None
    imageio_writer = None

    fourcc = cv2.VideoWriter_fourcc(*"avc1")
    writer = cv2.VideoWriter(video_output, fourcc, fps_salida, (w, h))
    if not writer.isOpened():
        writer.release()
        writer = None
        try:
            import imageio
            imageio_writer = imageio.get_writer(
                video_output,
                fps=fps_salida,
                codec="libx264",
                quality=None,
                ffmpeg_params=["-crf", "23", "-preset", "fast", "-pix_fmt", "yuv420p"],
            )
            use_imageio = True
        except Exception as e_io:
            cap.release()
            raise ValueError(
                f"No se pudo crear VideoWriter (avc1 ni imageio): {e_io}"
            ) from e_io

    historiales: dict = defaultdict(lambda: deque(maxlen=trail_length))
    frames_escritos = 0
    frame_num = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            dets = dets_por_frame.get(frame_num, [])

            # Dibuja zonas
            for zona in zonas:
                x1 = int(zona["x"] * w)
                y1 = int(zona["y"] * h)
                x2 = int((zona["x"] + zona["ancho"]) * w)
                y2 = int((zona["y"] + zona["alto"]) * h)
                _draw_dashed_rect(frame, (x1, y1), (x2, y2), (240, 240, 240))
                cv2.putText(frame, f"Zona {zona['id']}", (x1 + 4, y1 + 18),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (240, 240, 240), 1, cv2.LINE_AA)

            # Dibuja trayectorias, cajas y etiquetas
            for det in dets:
                tid = det["track_id"]
                cx = int(det["x"] * w)
                cy = int(det["y"] * h)
                color = _color(tid)

                historiales[tid].append((cx, cy))
                _draw_trail(frame, list(historiales[tid]), color)

                bw = max(10, int(det["ancho"] * w))
                bh = max(20, int(det["alto"] * h))
                rx1 = max(0, cx - bw // 2)
                ry1 = max(0, cy - bh // 2)
                rx2 = min(w - 1, cx + bw // 2)
                ry2 = min(h - 1, cy + bh // 2)
                cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), color, 2)

                label = (f"ID {tid} · {det['confianza']:.2f}"
                         if tid >= 0 else f"· {det['confianza']:.2f}")
                cv2.putText(frame, label, (rx1, max(12, ry1 - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1, cv2.LINE_AA)

            if use_imageio:
                imageio_writer.append_data(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            else:
                writer.write(frame)
            frames_escritos += 1
            frame_num += 1

    finally:
        cap.release()
        if use_imageio:
            imageio_writer.close()
        elif writer is not None:
            writer.release()

    tamaño = os.path.getsize(video_output) if os.path.exists(video_output) else 0
    return {
        "frames_procesados": frames_escritos,
        "duracion_seg": round(frames_escritos / fps_salida, 2) if fps_salida > 0 else 0,
        "tamaño_archivo": tamaño,
    }
