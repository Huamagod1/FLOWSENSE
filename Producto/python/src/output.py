import csv
import json
import sys

_CABECERA = ["id_video", "frame_numero", "zona_id", "track_id",
             "x_centro_norm", "y_centro_norm", "confianza", "detenida"]


def abrir_csv(ruta):
    """Abre el CSV de salida y escribe la cabecera. Devuelve (file_obj, csv.writer)."""
    f = open(ruta, "w", newline="", encoding="utf-8")
    writer = csv.writer(f)
    writer.writerow(_CABECERA)
    return f, writer


def escribir_deteccion(writer, id_video, frame_num, zona_id, track_id, x, y, conf, detenida):
    writer.writerow([
        id_video, frame_num, zona_id, track_id,
        round(x, 6), round(y, 6), round(conf, 4),
        "true" if detenida else "false",
    ])


def imprimir_resumen(frames, detecciones, duracion, status="OK", mensaje=None,
                     aborted_by_user=False, detecciones_detenidas=0,
                     tasa_detencion_global=0.0, modelo_usado="",
                     personas_unicas_total=None,
                     tiempo_permanencia_promedio_global=None,
                     flujo_entre_zonas=None,
                     metricas_por_zona=None,
                     video_overlay_path=None,
                     confiabilidad=None,
                     eventos_count=0):
    """Imprime en stdout la línea JSON que Spring Boot captura al terminar el proceso."""
    resumen = {
        "frames_procesados": frames,
        "detecciones_totales": detecciones,
        "detecciones_detenidas": detecciones_detenidas,
        "tasa_detencion_global": round(tasa_detencion_global, 3),
        "duracion_seg": round(duracion, 2),
        "modelo_usado": modelo_usado,
        "status": status,
    }
    if personas_unicas_total is not None:
        resumen["personas_unicas_total"] = personas_unicas_total
    if tiempo_permanencia_promedio_global is not None:
        resumen["tiempo_permanencia_promedio_global"] = round(tiempo_permanencia_promedio_global, 2)
    if flujo_entre_zonas is not None:
        resumen["flujo_entre_zonas"] = flujo_entre_zonas
    if metricas_por_zona is not None:
        resumen["metricas_por_zona"] = metricas_por_zona
    if video_overlay_path is not None:
        resumen["video_overlay_path"] = video_overlay_path
    if confiabilidad is not None:
        resumen["confiabilidad"] = confiabilidad
    if eventos_count:
        resumen["eventos_count"] = eventos_count
    if mensaje is not None:
        resumen["mensaje"] = mensaje
    if aborted_by_user:
        resumen["aborted_by_user"] = True
    print(json.dumps(resumen))
    sys.stdout.flush()
