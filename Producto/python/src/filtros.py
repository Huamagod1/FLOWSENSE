def caja_valida(ancho_norm, alto_norm):
    """False si el área de la caja es <0.5% del frame (falso positivo o persona muy lejana)."""
    return ancho_norm * alto_norm >= 0.005


def frame_valido(frame):
    """False si el frame es None o está en negro (frame corrupto)."""
    if frame is None:
        return False
    return frame.mean() >= 5
