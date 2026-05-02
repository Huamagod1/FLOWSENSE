package cl.duoc.flowsense.procesamiento;

import java.nio.file.Path;

public record FrameExtractionResult(
        Path pngPath,
        Integer ancho,
        Integer alto,
        Integer duracionSegundos
) {}
