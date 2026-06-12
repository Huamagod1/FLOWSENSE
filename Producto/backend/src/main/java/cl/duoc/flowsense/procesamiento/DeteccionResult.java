package cl.duoc.flowsense.procesamiento;

import java.nio.file.Path;
import java.util.Map;

public record DeteccionResult(
        Integer framesProcesados,
        Integer deteccionesTotales,
        Integer duracionSeg,
        Integer fpsProcesamiento,
        Path csvPath,
        Map<Integer, Long> mapaZonas,
        TrackingData trackingData,
        ConfiabilidadData confiabilidadData
) {}
