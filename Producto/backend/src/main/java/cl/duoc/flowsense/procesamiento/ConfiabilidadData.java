package cl.duoc.flowsense.procesamiento;

public record ConfiabilidadData(
        Double confianzaPromedio,
        Double calidadTracking,
        Double scoreConfiabilidad,
        String nivelConfiabilidad,
        String videoOverlayPath,
        String eventosJsonPath
) {}
