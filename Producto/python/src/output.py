import csv
import json
import sys

_CABECERA = ["id_video", "frame_numero", "zona_id", "x_centro_norm", "y_centro_norm", "confianza", "detenida"]


def abrir_csv(ruta):
    """Abre el CSV de salida y escribe la cabecera. Devuelve (file_obj, csv.writer)."""
    f = open(ruta, "w", newline="", encoding="utf-8")
    writer = csv.writer(f)
    writer.writerow(_CABECERA)
    return f, writer


def escribir_deteccion(writer, id_video, frame_num, zona_id, x, y, conf, detenida):
    writer.writerow([
        id_video, frame_num, zona_id,
        round(x, 6), round(y, 6), round(conf, 4),
        "true" if detenida else "false",
    ])


def imprimir_resumen(frames, detecciones, duracion, status="OK", mensaje=None,
                     aborted_by_user=False, detecciones_detenidas=0,
                     tasa_detencion_global=0.0, modelo_usado=""):
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
    if mensaje is not None:
        resumen["mensaje"] = mensaje
    if aborted_by_user:
        resumen["aborted_by_user"] = True
    print(json.dumps(resumen))
    sys.stdout.flush()
