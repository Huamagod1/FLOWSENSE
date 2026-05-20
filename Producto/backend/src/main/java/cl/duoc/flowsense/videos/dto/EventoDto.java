package cl.duoc.flowsense.videos.dto;

public record EventoDto(
        Double tiempo,
        Integer frame,
        Integer trackId,
        String tipo,
        Integer zonaId,
        Double confianza,
        Double xNorm,
        Double yNorm
) {}
