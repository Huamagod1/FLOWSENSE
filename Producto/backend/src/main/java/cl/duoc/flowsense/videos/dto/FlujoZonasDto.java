package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.FlujoEntreZonas;

public record FlujoZonasDto(
        Long id,
        Long zonaOrigenId,
        Long zonaDestinoId,
        Integer conteoTracks
) {
    public static FlujoZonasDto from(FlujoEntreZonas f) {
        return new FlujoZonasDto(f.getId(), f.getZonaOrigenId(), f.getZonaDestinoId(), f.getConteoTracks());
    }
}
