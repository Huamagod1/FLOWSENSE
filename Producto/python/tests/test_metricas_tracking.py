"""Tests de las funciones puras de métricas de tracking."""
import pandas as pd
import pytest

from src.metricas_tracking import (
    calcular_entradas_salidas,
    calcular_flujo_entre_zonas,
    calcular_ots_tracking,
    calcular_personas_unicas,
    calcular_tasa_conversion,
    calcular_tiempo_permanencia_por_track,
    calcular_tiempo_permanencia_promedio,
    calcular_velocidad_flujo_promedio,
)


# ── fixtures ──────────────────────────────────────────────────────────────────

def _df(rows):
    """Construye un DataFrame con las columnas mínimas requeridas."""
    return pd.DataFrame(rows, columns=[
        "frame_numero", "zona_id", "track_id",
        "x_centro_norm", "y_centro_norm",
    ])


@pytest.fixture
def df_simple():
    """
    3 tracks en zona 1.
    track 1: frames 0,1,2  (3 frames = 3 segundos)
    track 2: frames 0,1    (2 frames)
    track 3: frame  0      (1 frame)
    """
    return _df([
        (0, 1, 1, 0.1, 0.1),
        (1, 1, 1, 0.1, 0.1),
        (2, 1, 1, 0.1, 0.1),
        (0, 1, 2, 0.5, 0.5),
        (1, 1, 2, 0.5, 0.5),
        (0, 1, 3, 0.9, 0.9),
    ])


@pytest.fixture
def df_multizona():
    """
    Track 1 va zona 1 → zona 2 → zona 1 (dos transiciones).
    Track 2 va zona 1 → zona 2 (una transición).
    """
    return _df([
        (0, 1, 1, 0.1, 0.1),
        (1, 2, 1, 0.6, 0.6),
        (2, 1, 1, 0.1, 0.1),
        (0, 1, 2, 0.2, 0.2),
        (1, 2, 2, 0.7, 0.7),
    ])


# ── personas únicas ───────────────────────────────────────────────────────────

def test_personas_unicas_cuenta_tracks_validos(df_simple):
    assert calcular_personas_unicas(df_simple) == 3


def test_personas_unicas_excluye_menos_uno():
    df = _df([
        (0, 1, -1, 0.1, 0.1),
        (1, 1, -1, 0.2, 0.2),
        (0, 1,  5, 0.3, 0.3),
    ])
    assert calcular_personas_unicas(df) == 1


def test_personas_unicas_vacio():
    df = _df([])
    assert calcular_personas_unicas(df) == 0


# ── tiempo de permanencia ─────────────────────────────────────────────────────

def test_tiempo_permanencia_promedio(df_simple):
    # track 1: 3 frames, track 2: 2 frames, track 3: 1 frame → promedio = 2.0
    resultado = calcular_tiempo_permanencia_promedio(df_simple, fps=1)
    assert abs(resultado - 2.0) < 1e-9


def test_tiempo_permanencia_por_track_longitud(df_simple):
    lista = calcular_tiempo_permanencia_por_track(df_simple, fps=1)
    assert len(lista) == 3
    segundos = {d["track_id"]: d["segundos"] for d in lista}
    assert segundos[1] == 3.0
    assert segundos[2] == 2.0
    assert segundos[3] == 1.0


def test_tiempo_permanencia_promedio_vacio():
    df = _df([])
    assert calcular_tiempo_permanencia_promedio(df) == 0.0


# ── entradas y salidas ────────────────────────────────────────────────────────

def test_entradas_salidas_zona1(df_simple):
    res = calcular_entradas_salidas(df_simple, zona_id=1)
    assert res["entradas"] == 3
    assert res["salidas"] == 3


def test_entradas_salidas_zona_inexistente(df_simple):
    res = calcular_entradas_salidas(df_simple, zona_id=99)
    assert res == {"entradas": 0, "salidas": 0}


# ── flujo entre zonas ─────────────────────────────────────────────────────────

def test_flujo_entre_zonas_umbral():
    """Con conteo < 3, no se reporta el flujo."""
    df = _df([
        (0, 1, 1, 0.1, 0.1),
        (1, 2, 1, 0.6, 0.6),
        (0, 1, 2, 0.2, 0.2),
        (1, 2, 2, 0.7, 0.7),
    ])
    resultado = calcular_flujo_entre_zonas(df)
    assert resultado == []


def test_flujo_entre_zonas_reporta_sobre_umbral():
    """Con 3+ transiciones iguales, se incluye en el resultado."""
    filas = []
    for tid in range(1, 4):   # 3 tracks distintos
        filas += [(0, 1, tid, 0.1, 0.1), (1, 2, tid, 0.6, 0.6)]
    df = _df(filas)
    resultado = calcular_flujo_entre_zonas(df)
    assert len(resultado) == 1
    assert resultado[0]["zona_origen"] == 1
    assert resultado[0]["zona_destino"] == 2
    assert resultado[0]["conteo"] == 3


# ── OTS con tracking ──────────────────────────────────────────────────────────

def test_ots_tracking(df_simple):
    # track 1: 3, track 2: 2, track 3: 1 → total = 6
    assert calcular_ots_tracking(df_simple) == 6.0


def test_ots_tracking_excluye_menos_uno():
    df = _df([
        (0, 1, -1, 0.1, 0.1),
        (1, 1, -1, 0.2, 0.2),
        (0, 1,  1, 0.3, 0.3),
    ])
    assert calcular_ots_tracking(df) == 1.0


# ── tasa de conversión ────────────────────────────────────────────────────────

def test_tasa_conversion(df_multizona):
    # Tracks 1 y 2 pasan por zona 1; ambos llegan a zona 2 → 100 %
    tasa = calcular_tasa_conversion(df_multizona, zona_origen_id=1, zona_objetivo_id=2)
    assert abs(tasa - 1.0) < 1e-9


def test_tasa_conversion_sin_tracks_origen():
    df = _df([(0, 2, 1, 0.5, 0.5)])
    assert calcular_tasa_conversion(df, zona_origen_id=99, zona_objetivo_id=2) == 0.0


# ── velocidad de flujo ────────────────────────────────────────────────────────

def test_velocidad_flujo_promedio_sin_movimiento():
    df = _df([
        (0, 1, 1, 0.5, 0.5),
        (1, 1, 1, 0.5, 0.5),
    ])
    assert calcular_velocidad_flujo_promedio(df, fps=1) == 0.0


def test_velocidad_flujo_promedio_con_movimiento():
    import math
    df = _df([
        (0, 1, 1, 0.0, 0.0),
        (1, 1, 1, 0.3, 0.4),  # distancia = 0.5
    ])
    v = calcular_velocidad_flujo_promedio(df, fps=1)
    assert abs(v - 0.5) < 1e-9
