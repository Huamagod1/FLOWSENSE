package cl.duoc.flowsense.procesamiento;

import java.nio.file.Path;
import java.util.Map;

public record DeteccionResult(
        Integer framesProcesados,
        Integer deteccionesTotales,
        Integer duracionSeg,
        Path csvPath,
        Map<Integer, Long> mapaZonas
) {}
