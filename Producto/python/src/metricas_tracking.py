"""
Funciones puras para calcular métricas de tracking a partir del DataFrame del CSV.
Entrada: pandas DataFrame con columnas [frame_numero, zona_id, track_id, x_centro_norm, y_centro_norm, ...]
Salida:  valores escalares o listas de dicts listos para serializar a JSON.
"""
import math
from typing import Dict, List

import pandas as pd


def calcular_personas_unicas(df_zona: pd.DataFrame) -> int:
    """COUNT DISTINCT track_id en la zona, excluyendo -1."""
    return int(df_zona[df_zona["track_id"] != -1]["track_id"].nunique())


def calcular_tiempo_permanencia_promedio(df_zona: pd.DataFrame, fps: float = 1) -> float:
    """
    Promedio de frames por track_id en la zona.
    Con fps=1 cada frame equivale a 1 segundo.
    """
    valid = df_zona[df_zona["track_id"] != -1]
    if valid.empty:
        return 0.0
    frames_por_track = valid.groupby("track_id")["frame_numero"].count()
    return float(frames_por_track.mean() / fps)


def calcular_tiempo_permanencia_por_track(df_zona: pd.DataFrame, fps: float = 1) -> List[Dict]:
    """Lista de {track_id, segundos} para histograma de distribución."""
    valid = df_zona[df_zona["track_id"] != -1]
    if valid.empty:
        return []
    frames_por_track = valid.groupby("track_id")["frame_numero"].count()
    return [
        {"track_id": int(tid), "segundos": float(cnt / fps)}
        for tid, cnt in frames_por_track.items()
    ]


def calcular_entradas_salidas(df: pd.DataFrame, zona_id) -> Dict:
    """
    Entrada = primer frame del track en zona_id.
    Salida  = último frame del track en zona_id.
    Retorna {"entradas": int, "salidas": int}.
    """
    df_zona = df[(df["zona_id"] == zona_id) & (df["track_id"] != -1)]
    if df_zona.empty:
        return {"entradas": 0, "salidas": 0}
    tracks = df_zona.groupby("track_id")["frame_numero"]
    return {"entradas": int(len(tracks.min())), "salidas": int(len(tracks.max()))}


def calcular_velocidad_flujo_promedio(df_zona: pd.DataFrame, fps: float = 1) -> float:
    """
    Distancia euclidiana normalizada entre frames consecutivos del mismo track_id,
    promediada sobre todas las transiciones. Unidad: normalizado/segundo.
    """
    valid = df_zona[df_zona["track_id"] != -1].sort_values(["track_id", "frame_numero"])
    distancias: List[float] = []
    for _, grupo in valid.groupby("track_id"):
        xs = grupo["x_centro_norm"].values
        ys = grupo["y_centro_norm"].values
        for i in range(1, len(xs)):
            d = math.sqrt((xs[i] - xs[i - 1]) ** 2 + (ys[i] - ys[i - 1]) ** 2)
            distancias.append(d * fps)
    return float(sum(distancias) / len(distancias)) if distancias else 0.0


def calcular_flujo_entre_zonas(df: pd.DataFrame) -> List[Dict]:
    """
    Por cada track_id, detecta transiciones zona_a → zona_b (ordenadas por frame_numero).
    Solo reporta flujos con conteo >= 3.
    """
    valid = df[df["track_id"] != -1].sort_values(["track_id", "frame_numero"])
    conteos: Dict[tuple, int] = {}
    for _, grupo in valid.groupby("track_id"):
        zonas = grupo["zona_id"].tolist()
        for i in range(1, len(zonas)):
            if zonas[i] != zonas[i - 1]:
                par = (int(zonas[i - 1]), int(zonas[i]))
                conteos[par] = conteos.get(par, 0) + 1
    return [
        {"zona_origen": origen, "zona_destino": destino, "conteo": cnt}
        for (origen, destino), cnt in sorted(conteos.items(), key=lambda x: -x[1])
        if cnt >= 3
    ]


def calcular_tasa_conversion(df: pd.DataFrame, zona_origen_id, zona_objetivo_id) -> float:
    """
    De los tracks que pasaron por zona_origen_id,
    retorna el porcentaje que también llegó a zona_objetivo_id (0.0 – 1.0).
    """
    valid = df[df["track_id"] != -1]
    tracks_origen = set(valid[valid["zona_id"] == zona_origen_id]["track_id"].unique())
    if not tracks_origen:
        return 0.0
    tracks_objetivo = set(valid[valid["zona_id"] == zona_objetivo_id]["track_id"].unique())
    return float(len(tracks_origen & tracks_objetivo) / len(tracks_origen))


def calcular_ots_tracking(df_zona: pd.DataFrame) -> float:
    """
    Suma de frames por track_id en la zona.
    Equivale a OTS sin doble conteo cuando una persona abandona y regresa.
    """
    valid = df_zona[df_zona["track_id"] != -1]
    if valid.empty:
        return 0.0
    return float(valid.groupby("track_id")["frame_numero"].count().sum())
