import json
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
    args = parsear_args()

    # ── Modo extraer-frame ────────────────────────────────────────────────────
    if args.modo == "extraer-frame":
        if not args.frame_output:
            print(json.dumps({
                "status": "ERROR",
                "mensaje": "--frame-output es requerido en modo extraer-frame",
            }))
            sys.stdout.flush()
            sys.exit(1)
        from src.extractor_frame import extraer_frame
        resultado = extraer_frame(args.video, args.frame_output, args.frame_segundo)
        print(json.dumps(resultado))
        sys.stdout.flush()
        sys.exit(0 if resultado.get("status") == "OK" else 1)

    # ── Modo detectar ─────────────────────────────────────────────────────────
    # Validar argumentos requeridos en este modo
    if not args.output:
        imprimir_resumen(0, 0, 0, status="ERROR",
                         mensaje="--output es requerido en modo detectar")
        sys.exit(1)
    if not args.zonas:
        imprimir_resumen(0, 0, 0, status="ERROR",
                         mensaje="--zonas es requerido en modo detectar")
        sys.exit(1)

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
        detector = Detector(args.conf, args.iou, args.imgsz, args.modelo, tracker=args.tracker)
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
    total_frames_video = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duracion_video_seg = int(total_frames_video / fps_video) if fps_video > 0 else 0

    # Instanciar preview antes del loop; sale con exit 1 si no hay display
    preview_window = None
    if args.preview:
        from src.preview import PreviewWindow
        preview_window = PreviewWindow()

    # Abrir CSV temprano para detectar errores de ruta antes de procesar
    csv_file, writer = abrir_csv(args.output)

    frames_procesados = 0
    detecciones_totales = 0
    frame_num = 0
    aborted_by_user = False

    # Colección en memoria para calcular tasa de detención post-proceso
    todas_detecciones = []

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

                # Acumular en memoria para post-procesamiento
                todas_detecciones.append({
                    "frame_numero": frame_num,
                    "zona_id": zona_id,
                    "track_id": det.get("track_id", -1),
                    "x_centro_norm": det["x_centro_norm"],
                    "y_centro_norm": det["y_centro_norm"],
                    "confianza": det["confianza"],
                })
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
        if preview_window is not None:
            preview_window.cerrar()

        # Post-procesamiento: calcular tasa de detención
        from src.deteccion_movimiento import calcular_detenidas
        todas_detecciones = calcular_detenidas(todas_detecciones)

        # Escribir CSV con columnas track_id y detenida
        for d in todas_detecciones:
            escribir_deteccion(
                writer, id_video, d["frame_numero"], d["zona_id"],
                d.get("track_id", -1),
                d["x_centro_norm"], d["y_centro_norm"], d["confianza"],
                d["detenida"],
            )
        csv_file.close()

    det_detenidas = sum(1 for d in todas_detecciones if d.get("detenida", False))
    tasa = det_detenidas / detecciones_totales if detecciones_totales > 0 else 0.0

    # Construir DataFrame una sola vez; lo reutilizan tracking, confiabilidad y eventos
    df_det = None
    if todas_detecciones:
        import pandas as pd
        df_det = pd.DataFrame(todas_detecciones)

    # Métricas de tracking (solo si tracker activo y hay detecciones)
    personas_unicas_total = None
    permanencia_global = None
    flujo_zonas = None
    metricas_por_zona_json = None

    if args.tracker != "none" and df_det is not None:
        from src.metricas_tracking import (
            calcular_personas_unicas,
            calcular_tiempo_permanencia_promedio,
            calcular_flujo_entre_zonas,
            calcular_entradas_salidas,
            calcular_ots_tracking,
            calcular_velocidad_flujo_promedio,
        )
        personas_unicas_total = int(df_det[df_det["track_id"] != -1]["track_id"].nunique())
        permanencia_global = calcular_tiempo_permanencia_promedio(df_det)
        flujo_zonas = calcular_flujo_entre_zonas(df_det)

        metricas_por_zona_json = {}
        for zona in zonas:
            zid = zona["id"]
            df_z = df_det[df_det["zona_id"] == zid]
            es = calcular_entradas_salidas(df_det, zid)
            metricas_por_zona_json[str(zid)] = {
                "personas_unicas": calcular_personas_unicas(df_z),
                "tiempo_permanencia_promedio": round(calcular_tiempo_permanencia_promedio(df_z), 2),
                "entradas": es["entradas"],
                "salidas": es["salidas"],
                "ots_tracking": calcular_ots_tracking(df_z),
                "velocidad_flujo_promedio": round(calcular_velocidad_flujo_promedio(df_z), 6),
            }

    # Confiabilidad, eventos y video overlay
    video_overlay_path = None
    confiabilidad_resumen = None
    eventos_count = 0

    if df_det is not None:
        from src.confiabilidad import generar_resumen_confiabilidad
        confiabilidad_resumen = generar_resumen_confiabilidad(df_det, frames_procesados)

        from src.eventos import generar_eventos
        _eventos_lista = generar_eventos(df_det, zonas, fps_video=fps_video)
        eventos_count = len(_eventos_lista)

        _eventos_path = args.output.rsplit(".", 1)[0] + "_eventos.json"
        with open(_eventos_path, "w", encoding="utf-8") as _ef:
            json.dump(_eventos_lista, _ef)

        try:
            from src.video_overlay import generar_video_overlay
            _overlay_path = args.output.rsplit(".", 1)[0] + "_overlay.mp4"
            generar_video_overlay(
                video_input=args.video,
                csv_detecciones=args.output,
                zonas_json=args.zonas,
                video_output=_overlay_path,
                trail_length=15,
            )
            video_overlay_path = _overlay_path
        except Exception as _e:
            import traceback as _tb
            print(f"[WARN] No se pudo generar video overlay: {_e}", file=sys.stderr)

    imprimir_resumen(
        frames_procesados, detecciones_totales, duracion_video_seg,
        aborted_by_user=aborted_by_user,
        detecciones_detenidas=det_detenidas,
        tasa_detencion_global=tasa,
        modelo_usado=args.modelo,
        personas_unicas_total=personas_unicas_total,
        tiempo_permanencia_promedio_global=permanencia_global,
        flujo_entre_zonas=flujo_zonas,
        metricas_por_zona=metricas_por_zona_json,
        video_overlay_path=video_overlay_path,
        confiabilidad=confiabilidad_resumen,
        eventos_count=eventos_count,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        imprimir_resumen(0, 0, 0, status="ERROR", mensaje=str(e))
        sys.exit(1)
