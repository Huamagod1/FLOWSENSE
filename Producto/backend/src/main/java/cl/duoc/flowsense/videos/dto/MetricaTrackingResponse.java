package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.videos.MetricaTracking;

public record MetricaTrackingResponse(
        Long idZona,
        Integer trackId,
        Double segundos
) {
    public static MetricaTrackingResponse from(MetricaTracking mt) {
        return new MetricaTrackingResponse(mt.getIdZona(), mt.getTrackId(), mt.getSegundos());
    }
}
