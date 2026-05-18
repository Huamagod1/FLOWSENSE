package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.Track;

public record TrackDto(
        Long id,
        Integer trackId,
        Long zonaInicioId,
        Long zonaFinId,
        Integer primerFrame,
        Integer ultimoFrame,
        Integer framesTotal,
        Double segundosTotal,
        Double velocidadProm
) {
    public static TrackDto from(Track t) {
        return new TrackDto(
                t.getId(),
                t.getTrackId(),
                t.getZonaInicioId(),
                t.getZonaFinId(),
                t.getPrimerFrame(),
                t.getUltimoFrame(),
                t.getFramesTotal(),
                t.getSegundosTotal(),
                t.getVelocidadProm()
        );
    }
}
