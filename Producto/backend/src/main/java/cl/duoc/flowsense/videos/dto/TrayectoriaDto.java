package cl.duoc.flowsense.videos.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Recorrido real punto-por-punto de una persona (track) dentro del video.
 * Los puntos vienen ordenados por frame_numero (orden temporal del recorrido).
 */
public record TrayectoriaDto(
        Integer trackId,
        List<PuntoTrayectoria> puntos
) {
    public record PuntoTrayectoria(
            BigDecimal x,
            BigDecimal y
    ) {}
}
