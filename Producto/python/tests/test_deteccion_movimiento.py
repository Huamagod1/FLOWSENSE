import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.deteccion_movimiento import calcular_detenidas


def _det(frame, x, y):
    return {"frame_numero": frame, "x_centro_norm": x, "y_centro_norm": y,
            "confianza": 0.9, "zona_id": 1}


class TestCalcularDetenidas(unittest.TestCase):

    def test_lista_vacia_retorna_lista_vacia(self):
        self.assertEqual(calcular_detenidas([]), [])

    def test_persona_quieta_marcada_detenida(self):
        """Mismas coordenadas en frame consecutivo → detenida=True."""
        dets = [_det(0, 0.5, 0.5), _det(1, 0.5, 0.5)]
        resultado = calcular_detenidas(dets)
        det_f0 = next(d for d in resultado if d["frame_numero"] == 0)
        self.assertTrue(det_f0["detenida"])

    def test_persona_moviendose_no_marcada_detenida(self):
        """Movimiento grande entre frames → detenida=False."""
        dets = [_det(0, 0.1, 0.1), _det(1, 0.9, 0.9)]
        resultado = calcular_detenidas(dets)
        det_f0 = next(d for d in resultado if d["frame_numero"] == 0)
        self.assertFalse(det_f0["detenida"])

    def test_borde_inferior_umbral_es_detenida(self):
        """Distancia 0.04 < 0.05 → detenida=True."""
        dets = [_det(0, 0.5, 0.5), _det(1, 0.54, 0.5)]  # dist = 0.04
        resultado = calcular_detenidas(dets)
        det_f0 = next(d for d in resultado if d["frame_numero"] == 0)
        self.assertTrue(det_f0["detenida"])

    def test_exactamente_en_umbral_no_es_detenida(self):
        """Distancia exactamente igual al umbral (0.05) → detenida=False (condición es <, no <=)."""
        dets = [_det(0, 0.5, 0.5), _det(1, 0.55, 0.5)]  # dist = 0.05
        resultado = calcular_detenidas(dets)
        det_f0 = next(d for d in resultado if d["frame_numero"] == 0)
        self.assertFalse(det_f0["detenida"])

    def test_unico_frame_ninguna_detenida(self):
        """Todas las detecciones en el mismo frame — sin frame siguiente → detenida=False."""
        dets = [_det(0, 0.3, 0.3), _det(0, 0.7, 0.7)]
        resultado = calcular_detenidas(dets)
        for det in resultado:
            self.assertFalse(det["detenida"])

    def test_multiples_personas_una_quieta_otra_moviendose(self):
        """Dos personas en frame 0; solo la que permanece cerca queda marcada."""
        dets = [
            _det(0, 0.1, 0.1),  # quieta: mismo lugar en frame 1
            _det(0, 0.9, 0.9),  # se mueve: muy lejos en frame 1
            _det(1, 0.1, 0.1),  # frame 1: persona quieta
            _det(1, 0.2, 0.2),  # frame 1: persona diferente
        ]
        resultado = calcular_detenidas(dets)
        dets_f0 = sorted([d for d in resultado if d["frame_numero"] == 0],
                         key=lambda d: d["x_centro_norm"])
        self.assertTrue(dets_f0[0]["detenida"])   # (0.1, 0.1) — quieta
        self.assertFalse(dets_f0[1]["detenida"])  # (0.9, 0.9) — se movió


if __name__ == "__main__":
    unittest.main()
