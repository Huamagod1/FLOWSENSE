import pandas as pd


def calcular_confianza_promedio(df) -> float:
    """Promedio de la columna confianza (0-1) en todas las detecciones."""
    if df is None or df.empty or "confianza" not in df.columns:
        return 0.0
    return float(df["confianza"].mean())


def calcular_calidad_tracking(df) -> float:
    """
    1 - (frames_con_tracks_perdidos / frames_totales).
    Un track se considera perdido en un frame si aparece ahí y luego no aparece
    en los siguientes 5 frames procesados, y su posición no estaba en el borde.
    """
    if df is None or df.empty or "track_id" not in df.columns:
        return 1.0

    tracks_con_id = df[df["track_id"] != -1]
    if tracks_con_id.empty:
        return 1.0

    frames_totales = df["frame_numero"].nunique()
    if frames_totales == 0:
        return 1.0

    all_frames = sorted(df["frame_numero"].unique())
    frame_idx = {f: i for i, f in enumerate(all_frames)}
    frames_con_perdidos: set = set()

    for tid, grupo in tracks_con_id.groupby("track_id"):
        frames_track = sorted(grupo["frame_numero"].unique())
        frame_set_track = set(frames_track)

        for frame_n in frames_track[:-1]:
            idx = frame_idx[frame_n]
            siguientes_5 = all_frames[idx + 1: idx + 6]
            if any(f in frame_set_track for f in siguientes_5):
                continue

            row = grupo[grupo["frame_numero"] == frame_n].iloc[0]
            x, y = float(row["x_centro_norm"]), float(row["y_centro_norm"])
            if not (x < 0.05 or x > 0.95 or y < 0.05 or y > 0.95):
                frames_con_perdidos.add(frame_n)

    return max(0.0, 1.0 - len(frames_con_perdidos) / frames_totales)


def calcular_porcentaje_frames_ok(df, frames_esperados: int) -> float:
    """% de frames esperados que efectivamente fueron procesados."""
    if frames_esperados <= 0:
        return 1.0
    frames_reales = df["frame_numero"].nunique() if (df is not None and not df.empty) else 0
    return min(1.0, frames_reales / frames_esperados)


def generar_resumen_confiabilidad(df, frames_esperados: int) -> dict:
    """
    Retorna dict con confianza_promedio, calidad_tracking, frames_procesados_ok,
    score_global y nivel (ALTO/MEDIO/BAJO).
    """
    confianza = calcular_confianza_promedio(df)
    tracking = calcular_calidad_tracking(df)
    frames_ok = calcular_porcentaje_frames_ok(df, frames_esperados)

    score = round(0.5 * confianza + 0.3 * tracking + 0.2 * frames_ok, 4)

    if score >= 0.8:
        nivel = "ALTO"
    elif score >= 0.6:
        nivel = "MEDIO"
    else:
        nivel = "BAJO"

    return {
        "confianza_promedio": round(confianza, 4),
        "calidad_tracking": round(tracking, 4),
        "frames_procesados_ok": round(frames_ok, 4),
        "score_global": score,
        "nivel": nivel,
    }
