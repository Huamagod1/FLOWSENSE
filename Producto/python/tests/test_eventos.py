"""Tests de la generación de eventos desde el DataFrame de detecciones."""
import pandas as pd
import pytest

from src.eventos import generar_eventos


def _df(rows):
    return pd.DataFrame(rows, columns=[
        "frame_numero", "zona_id", "track_id",
        "x_centro_norm", "y_centro_norm", "confianza",
    ])


@pytest.fixture
def df_track_multiframe():
    """Track 1 en zona 1 durante 3 frames; track 2 en zona 1 durante 1 frame."""
    return _df([
        (0, 1, 1, 0.3, 0.3, 0.90),
        (1, 1, 1, 0.3, 0.3, 0.88),
        (2, 1, 1, 0.3, 0.3, 0.85),
        (0, 1, 2, 0.6, 0.6, 0.75),
    ])


@pytest.fixture
def df_sin_tracking():
    """Solo detecciones sin track_id real (track_id=-1)."""
    return _df([
        (0, 1, -1, 0.5, 0.5, 0.80),
        (1, 1, -1, 0.5, 0.5, 0.78),
    ])


# ── contenido de eventos ──────────────────────────────────────────────────────

def test_deteccion_por_cada_fila(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    detecciones = [e for e in eventos if e["tipo"] == "DETECCION"]
    assert len(detecciones) == 4  # 4 filas → 4 eventos DETECCION


def test_entrada_por_track_zona(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    entradas = [e for e in eventos if e["tipo"] == "ENTRADA"]
    # track 1 zona 1, track 2 zona 1 → 2 ENTRADA
    assert len(entradas) == 2


def test_salida_solo_cuando_multiframe(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    salidas = [e for e in eventos if e["tipo"] == "SALIDA"]
    # Track 1: 3 frames → SALIDA; track 2: 1 frame → sin SALIDA
    assert len(salidas) == 1
    assert salidas[0]["track_id"] == 1
    assert salidas[0]["frame"] == 2


def test_no_entrada_salida_para_track_menos_uno(df_sin_tracking):
    eventos = generar_eventos(df_sin_tracking, fps_video=1.0)
    tipos = {e["tipo"] for e in eventos}
    assert "ENTRADA" not in tipos
    assert "SALIDA" not in tipos
    assert "DETECCION" in tipos


def test_orden_cronologico(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    frames = [e["frame"] for e in eventos]
    assert frames == sorted(frames)


def test_tiempo_calculado_correctamente(df_track_multiframe):
    fps = 25.0
    eventos = generar_eventos(df_track_multiframe, fps_video=fps)
    for e in eventos:
        assert abs(e["tiempo"] - round(e["frame"] / fps, 2)) < 1e-6


def test_estructura_evento(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    claves_requeridas = {"tiempo", "frame", "track_id", "tipo", "zona_id",
                         "confianza", "x_norm", "y_norm"}
    for e in eventos:
        assert claves_requeridas.issubset(e.keys())


# ── casos borde ───────────────────────────────────────────────────────────────

def test_dataframe_vacio():
    assert generar_eventos(_df([])) == []


def test_none_retorna_vacio():
    assert generar_eventos(None) == []


def test_entrada_frame_correcto(df_track_multiframe):
    eventos = generar_eventos(df_track_multiframe, fps_video=1.0)
    entrada_t1 = next(e for e in eventos if e["tipo"] == "ENTRADA" and e["track_id"] == 1)
    assert entrada_t1["frame"] == 0


def test_un_solo_track_multizones():
    """Track que pasa por dos zonas genera ENTRADA/SALIDA separadas por zona."""
    df = _df([
        (0, 1, 1, 0.2, 0.2, 0.9),
        (1, 1, 1, 0.2, 0.2, 0.9),
        (2, 2, 1, 0.7, 0.7, 0.9),
        (3, 2, 1, 0.7, 0.7, 0.9),
    ])
    eventos = generar_eventos(df, fps_video=1.0)
    entradas = [e for e in eventos if e["tipo"] == "ENTRADA"]
    salidas = [e for e in eventos if e["tipo"] == "SALIDA"]
    assert len(entradas) == 2  # una por zona
    assert len(salidas) == 2
