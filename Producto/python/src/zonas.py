import json


def cargar_zonas(ruta_json):
    """Lee y valida el JSON de zonas. Lanza FileNotFoundError o ValueError si hay problema."""
    try:
        with open(ruta_json, "r", encoding="utf-8") as f:
            datos = json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Archivo de zonas no encontrado: {ruta_json}")
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON de zonas malformado: {e}")

    if "id_video" not in datos or "zonas" not in datos:
        raise ValueError("JSON de zonas debe contener los campos 'id_video' y 'zonas'")

    campos_requeridos = ("id", "x", "y", "ancho", "alto")
    for zona in datos["zonas"]:
        for campo in campos_requeridos:
            if campo not in zona:
                raise ValueError(f"Zona malformada, falta campo '{campo}': {zona}")

    return datos


def asignar_zona(x, y, zonas):
    """
    Devuelve el id de la primera zona (orden de lista) que contiene el punto (x, y).
    Retorna None si el punto cae fuera de todas las zonas.
    Coordenadas normalizadas en [0, 1].
    """
    for zona in zonas:
        if (zona["x"] <= x <= zona["x"] + zona["ancho"] and
                zona["y"] <= y <= zona["y"] + zona["alto"]):
            return zona["id"]
    return None
