import math
from collections import defaultdict


def calcular_detenidas(detecciones, umbral=0.05):
    """
    Marca cada detección como 'detenida' si en el siguiente frame muestreado
    existe otra detección dentro de la distancia euclidiana normalizada `umbral`.

    Modifica la lista en-place agregando el campo 'detenida' (bool) a cada dict.
    Las detecciones del último frame muestreado se marcan detenida=False porque
    no hay frame siguiente con el que comparar.
    """
    if not detecciones:
        return []

    por_frame = defaultdict(list)
    for det in detecciones:
        por_frame[det["frame_numero"]].append(det)

    frames_ordenados = sorted(por_frame.keys())

    for i, frame_t in enumerate(frames_ordenados):
        dets_siguiente = []
        if i + 1 < len(frames_ordenados):
            dets_siguiente = por_frame[frames_ordenados[i + 1]]

        for det in por_frame[frame_t]:
            det["detenida"] = _cerca_de_alguna(det, dets_siguiente, umbral)

    return detecciones


def _cerca_de_alguna(det, candidatos, umbral):
    x0, y0 = det["x_centro_norm"], det["y_centro_norm"]
    for c in candidatos:
        dx = x0 - c["x_centro_norm"]
        dy = y0 - c["y_centro_norm"]
        if math.sqrt(dx * dx + dy * dy) < umbral:
            return True
    return False
