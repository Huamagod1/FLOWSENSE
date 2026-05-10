import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.zonas import asignar_zona


class TestAsignarZona(unittest.TestCase):

    def setUp(self):
        self.zonas = [
            {"id": 1, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.4},
            {"id": 2, "x": 0.5, "y": 0.1, "ancho": 0.4, "alto": 0.5},
        ]

    def test_punto_dentro_zona_1(self):
        self.assertEqual(asignar_zona(0.2, 0.2, self.zonas), 1)

    def test_punto_dentro_zona_2(self):
        self.assertEqual(asignar_zona(0.7, 0.3, self.zonas), 2)

    def test_punto_fuera_de_todas(self):
        self.assertIsNone(asignar_zona(0.0, 0.0, self.zonas))

    def test_punto_en_borde_superior_izquierdo(self):
        # El borde exacto de la zona debe considerarse dentro
        self.assertEqual(asignar_zona(0.1, 0.1, self.zonas), 1)

    def test_punto_en_borde_inferior_derecho(self):
        self.assertEqual(asignar_zona(0.4, 0.5, self.zonas), 1)

    def test_superposicion_retorna_primera_en_lista(self):
        zonas_overlap = [
            {"id": 1, "x": 0.0, "y": 0.0, "ancho": 0.7, "alto": 0.7},
            {"id": 2, "x": 0.5, "y": 0.5, "ancho": 0.5, "alto": 0.5},
        ]
        # (0.6, 0.6) cae en ambas zonas; debe retornar id=1
        self.assertEqual(asignar_zona(0.6, 0.6, zonas_overlap), 1)

    def test_lista_vacia(self):
        self.assertIsNone(asignar_zona(0.5, 0.5, []))


if __name__ == "__main__":
    unittest.main()
