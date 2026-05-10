import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.zonas import cargar_zonas

_ZONAS_VALIDAS = {
    "id_video": 1,
    "zonas": [{"id": 1, "x": 0.0, "y": 0.0, "ancho": 0.5, "alto": 1.0}],
}


def _escribir_json(path, contenido, bom=False):
    encoding = "utf-8-sig" if bom else "utf-8"
    with open(path, "w", encoding=encoding) as f:
        json.dump(contenido, f)


class TestCargarZonas(unittest.TestCase):

    def test_sin_bom(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp:
            ruta = tmp.name
        try:
            _escribir_json(ruta, _ZONAS_VALIDAS, bom=False)
            datos = cargar_zonas(ruta)
            self.assertEqual(datos["id_video"], 1)
            self.assertEqual(len(datos["zonas"]), 1)
        finally:
            os.unlink(ruta)

    def test_con_bom(self):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tmp:
            ruta = tmp.name
        try:
            _escribir_json(ruta, _ZONAS_VALIDAS, bom=True)
            datos = cargar_zonas(ruta)
            self.assertEqual(datos["id_video"], 1)
            self.assertEqual(len(datos["zonas"]), 1)
        finally:
            os.unlink(ruta)


if __name__ == "__main__":
    unittest.main()
