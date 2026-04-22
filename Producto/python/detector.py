import sys
import time
import traceback

import cv2

from src.cli import parsear_args
from src.zonas import cargar_zonas, asignar_zona
from src.filtros import frame_valido, caja_valida
from src.detector_core import detectar_frame
from src.output import abrir_csv, escribir_deteccion, imprimir_resumen


def main():
    inicio = time.time()
    args = parsear_args()

    # Cargar y validar zonas antes de abrir el video
    try:
        datos_zonas = cargar_zonas(args.zonas)
    except (FileNotFoundError, ValueError) as e:
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)

    id_video = datos_zonas["id_video"]
    zonas = datos_zonas["zonas"]

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        imprimir_resumen(0, 0, 0, status="ERROR",
                         mensaje=f"No se pudo abrir el video: {args.video}")
        sys.exit(1)

    fps_video = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_step = max(1, int(round(fps_video / args.fps)))

    csv_file, writer = abrir_csv(args.output)
    frames_procesados = 0
    detecciones_totales = 0
    frame_num = 0

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

            detecciones = detectar_frame(frame, args.conf, args.iou, args.imgsz)
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

            frame_num += 1

    finally:
        cap.release()
        csv_file.close()

    duracion = time.time() - inicio
    imprimir_resumen(frames_procesados, detecciones_totales, duracion)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)
