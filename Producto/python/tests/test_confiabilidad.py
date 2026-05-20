"""Tests de las funciones de confiabilidad del análisis."""
import pandas as pd
import pytest

from src.confiabilidad import (
    calcular_calidad_tracking,
    calcular_confianza_promedio,
    calcular_porcentaje_frames_ok,
    generar_resumen_confiabilidad,
)


def _df(rows):
    return pd.DataFrame(rows, columns=[
        "frame_numero", "zona_id", "track_id",
        "x_centro_norm", "y_centro_norm", "confianza",
    ])


@pytest.fixture
def df_basico():
    return _df([
        (0,  1, 1, 0.5, 0.5, 0.90),
        (1,  1, 1, 0.5, 0.5, 0.85),
        (2,  1, 2, 0.5, 0.5, 0.70),
    ])


# ── confianza promedio ────────────────────────────────────────────────────────

def test_confianza_promedio(df_basico):
    resultado = calcular_confianza_promedio(df_basico)
    esperado = (0.90 + 0.85 + 0.70) / 3
    assert abs(resultado - esperado) < 1e-9


def test_confianza_promedio_vacio():
    assert calcular_confianza_promedio(_df([])) == 0.0


def test_confianza_promedio_dataframe_none():
    assert calcular_confianza_promedio(None) == 0.0


# ── calidad tracking ──────────────────────────────────────────────────────────

def test_calidad_tracking_sin_tracks():
    """Si todos los track_id son -1, calidad = 1.0."""
    df = _df([
        (0, 1, -1, 0.5, 0.5, 0.8),
        (1, 1, -1, 0.5, 0.5, 0.8),
    ])
    assert calcular_calidad_tracking(df) == 1.0


def test_calidad_tracking_track_continuo():
    """Track que aparece en frames consecutivos no se considera perdido."""
    df = _df([
        (0, 1, 1, 0.5, 0.5, 0.9),
        (1, 1, 1, 0.5, 0.5, 0.9),
        (2, 1, 1, 0.5, 0.5, 0.9),
        (3, 1, 1, 0.5, 0.5, 0.9),
        (4, 1, 1, 0.5, 0.5, 0.9),
    ])
    assert calcular_calidad_tracking(df) == 1.0


def test_calidad_tracking_vacio():
    assert calcular_calidad_tracking(_df([])) == 1.0


def test_calidad_tracking_sale_por_borde():
    """Track que desaparece desde posición en borde no se cuenta como perdido."""
    df = _df([
        (0, 1, 1, 0.01, 0.5, 0.9),  # x muy cerca de borde izquierdo
        (10, 1, 2, 0.5, 0.5, 0.9),  # otro track
    ])
    # Track 1 desaparece pero estaba en el borde → no se penaliza
    calidad = calcular_calidad_tracking(df)
    assert calidad == 1.0


# ── porcentaje frames ok ──────────────────────────────────────────────────────

def test_porcentaje_frames_ok_exacto(df_basico):
    # df_basico tiene frames 0, 1, 2 → 3 frames únicos
    resultado = calcular_porcentaje_frames_ok(df_basico, frames_esperados=3)
    assert resultado == 1.0


def test_porcentaje_frames_ok_parcial(df_basico):
    resultado = calcular_porcentaje_frames_ok(df_basico, frames_esperados=6)
    assert abs(resultado - 0.5) < 1e-9


def test_porcentaje_frames_ok_cero_esperados():
    assert calcular_porcentaje_frames_ok(_df([]), frames_esperados=0) == 1.0


def test_porcentaje_frames_ok_maximo_uno(df_basico):
    # Si hay más frames reales que esperados, el máximo es 1.0
    resultado = calcular_porcentaje_frames_ok(df_basico, frames_esperados=1)
    assert resultado == 1.0


# ── resumen general ───────────────────────────────────────────────────────────

def test_resumen_estructura(df_basico):
    res = generar_resumen_confiabilidad(df_basico, frames_esperados=3)
    assert set(res.keys()) == {
        "confianza_promedio", "calidad_tracking",
        "frames_procesados_ok", "score_global", "nivel",
    }


def test_resumen_nivel_alto():
    df = _df([(i, 1, 1, 0.5, 0.5, 0.95) for i in range(10)])
    res = generar_resumen_confiabilidad(df, frames_esperados=10)
    assert res["nivel"] == "ALTO"
    assert res["score_global"] >= 0.8


def test_resumen_nivel_medio():
    # Confianza baja → score puede caer entre 0.6 y 0.8
    df = _df([(i, 1, 1, 0.5, 0.5, 0.60) for i in range(5)])
    res = generar_resumen_confiabilidad(df, frames_esperados=10)
    assert res["nivel"] in ("MEDIO", "BAJO")


def test_resumen_score_entre_cero_y_uno(df_basico):
    res = generar_resumen_confiabilidad(df_basico, frames_esperados=3)
    assert 0.0 <= res["score_global"] <= 1.0
