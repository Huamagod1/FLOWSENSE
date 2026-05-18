package cl.duoc.flowsense.procesamiento;

import java.util.List;
import java.util.Map;

public record TrackingData(
        Integer personasUnicasTotal,
        Double tiempoPermanenciaPromedioGlobal,
        List<FlujoZona> flujoEntreZonas,
        Map<Integer, ZoneMetrics> metricasPorZona
) {
    public record FlujoZona(int zonaOrigen, int zonaDestino, int conteo) {}

    public record ZoneMetrics(
            int personasUnicas,
            double tiempoPermanenciaProm,
            int entradas,
            int salidas,
            double otsTracking,
            Double velocidadFlujoProm
    ) {}
}
