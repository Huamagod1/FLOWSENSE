import sys
import time
import traceback
from collections import deque

import cv2

from src.cli import parsear_args
from src.zonas import cargar_zonas, asignar_zona
from src.filtros import frame_valido, caja_valida
from src.output import abrir_csv, escribir_deteccion, imprimir_resumen


def main():
    inicio = time.time()
    args = parsear_args()

    if args.stub:
        from src.detector_stub import Detector
    else:
        from src.detector_core import Detector

    # Cargar y validar zonas antes de abrir el video
    try:
        datos_zonas = cargar_zonas(args.zonas)
    except (FileNotFoundError, ValueError) as e:
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)

    id_video = datos_zonas["id_video"]
    zonas = datos_zonas["zonas"]

    try:
        detector = Detector(args.conf, args.iou, args.imgsz, args.modelo)
    except Exception as e:
        imprimir_resumen(0, 0, 0, status="ERROR",
                         mensaje=f"Error al cargar modelo YOLOv8: {e}")
        sys.exit(1)

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        imprimir_resumen(0, 0, 0, status="ERROR",
                         mensaje=f"No se pudo abrir el video: {args.video}")
        sys.exit(1)

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_step = max(1, int(round(fps_video / args.fps)))

    # Instanciar preview antes del loop; sale con exit 1 si no hay display
    preview_window = None
    if args.preview:
        from src.preview import PreviewWindow
        preview_window = PreviewWindow()

    csv_file, writer = abrir_csv(args.output)
    frames_procesados = 0
    detecciones_totales = 0
    frame_num = 0
    aborted_by_user = False

    # Promedio móvil de FPS de procesamiento (ventana de 5 frames)
    tiempos_frame = deque(maxlen=5)
    t_ultimo_frame = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # 1. Muestreo: saltar frames que no corresponden al paso
            if frame_num % frame_step != 0:
                frame_num += 1
                continue

            # 2. Validar solo el frame muestreado (corrupto / en negro)
            if not frame_valido(frame):
                frame_num += 1
                continue

            detecciones = detector.detectar_frame(frame, args.max_det)
            frames_procesados += 1

            for det in detecciones:
                # 3. Filtro de tamaño mínimo
                if not caja_valida(det["ancho_norm"], det["alto_norm"]):
                    continue

                # 4. Asignación a zona; descartar si cae fuera de todas
                zona_id = asignar_zona(det["x_centro_norm"], det["y_centro_norm"], zonas)
                if zona_id is None:
                    continue

                escribir_deteccion(
                    writer, id_video, frame_num,
                    zona_id,
                    det["x_centro_norm"], det["y_centro_norm"],
                    det["confianza"],
                )
                detecciones_totales += 1

            if preview_window is not None:
                ahora = time.time()
                tiempos_frame.append(ahora - t_ultimo_frame)
                t_ultimo_frame = ahora
                fps_proc = 1.0 / (sum(tiempos_frame) / len(tiempos_frame))

                accion = preview_window.mostrar(
                    frame, zonas, detecciones,
                    frame_num, detecciones_totales, fps_proc, args.fps,
                )
                if accion == "quit":
                    aborted_by_user = True
                    break

            frame_num += 1

    finally:
        cap.release()
        csv_file.close()
        if preview_window is not None:
            preview_window.cerrar()

    duracion = time.time() - inicio
    imprimir_resumen(frames_procesados, detecciones_totales, duracion,
                     aborted_by_user=aborted_by_user)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)
