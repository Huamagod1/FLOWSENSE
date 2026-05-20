from typing import List


def generar_eventos(df, zonas=None, fps_video: float = 1.0) -> List[dict]:
    """
    Lista cronológica de eventos detectados desde el DataFrame de detecciones.

    Tipos:
    - "DETECCION": cada fila del CSV (persona en zona en un frame)
    - "ENTRADA": primer frame de un track_id en una zona específica
    - "SALIDA": último frame de un track_id en una zona (si es distinto del primero)

    ENTRADA/SALIDA solo se generan para track_id != -1.
    """
    if df is None or df.empty:
        return []

    eventos: List[dict] = []

    def _fila_a_evento(row, tipo: str) -> dict:
        frame_n = int(row["frame_numero"])
        track_id = int(row["track_id"]) if "track_id" in row.index else -1
        return {
            "tiempo": round(frame_n / fps_video, 2),
            "frame": frame_n,
            "track_id": track_id,
            "tipo": tipo,
            "zona_id": int(row["zona_id"]),
            "confianza": round(float(row["confianza"]), 4),
            "x_norm": round(float(row["x_centro_norm"]), 4),
            "y_norm": round(float(row["y_centro_norm"]), 4),
        }

    # DETECCION: una entrada por cada fila del DataFrame
    for _, row in df.iterrows():
        eventos.append(_fila_a_evento(row, "DETECCION"))

    # ENTRADA y SALIDA solo para tracks con id real
    if "track_id" in df.columns:
        tracks_validos = df[df["track_id"] != -1]
        for (tid, zid), grupo in tracks_validos.groupby(["track_id", "zona_id"]):
            ordenado = grupo.sort_values("frame_numero")
            primera = ordenado.iloc[0]
            ultima = ordenado.iloc[-1]

            eventos.append(_fila_a_evento(primera, "ENTRADA"))

            if int(ultima["frame_numero"]) != int(primera["frame_numero"]):
                eventos.append(_fila_a_evento(ultima, "SALIDA"))

    _tipo_orden = {"ENTRADA": 0, "DETECCION": 1, "SALIDA": 2}
    eventos.sort(key=lambda e: (e["frame"], _tipo_orden.get(e["tipo"], 1)))
    return eventos
