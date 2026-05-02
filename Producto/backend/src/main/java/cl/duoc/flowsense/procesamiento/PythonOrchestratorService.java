package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.common.exceptions.ProcesamientoException;
import cl.duoc.flowsense.recintos.Zona;
import cl.duoc.flowsense.videos.Video;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class PythonOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(PythonOrchestratorService.class);

    private final String pythonBin;
    private final String scriptPath;
    private final String resultsDir;
    private final ObjectMapper objectMapper;

    public PythonOrchestratorService(
            @Value("${app.python.bin}") String pythonBin,
            @Value("${app.python.script}") String scriptPath,
            @Value("${app.results-dir}") String resultsDir,
            ObjectMapper objectMapper) {
        this.pythonBin = pythonBin;
        this.scriptPath = scriptPath;
        this.resultsDir = resultsDir;
        this.objectMapper = objectMapper;
    }

    public FrameExtractionResult extraerFrame(Video video) {
        Path framesDir = Paths.get(resultsDir, "frames");
        Path outputPng = framesDir.resolve(UUID.randomUUID() + ".png");

        try {
            Files.createDirectories(framesDir);
        } catch (IOException e) {
            throw new ProcesamientoException("No se pudo crear directorio de frames: " + e.getMessage());
        }

        List<String> comando = List.of(
                pythonBin,
                scriptPath,
                "--modo", "extraer-frame",
                "--video", video.getRutaArchivo(),
                "--frame-output", outputPng.toAbsolutePath().toString(),
                "--frame-segundo", "5"
        );

        log.info("Extrayendo frame del video {}: {}", video.getId(), String.join(" ", comando));

        Process process;
        try {
            ProcessBuilder pb = new ProcessBuilder(comando);
            pb.redirectErrorStream(true);
            process = pb.start();
        } catch (IOException e) {
            throw new ProcesamientoException("No se pudo iniciar proceso Python: " + e.getMessage());
        }

        List<String> outputLines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                outputLines.add(line);
                log.debug("Python [video={}]: {}", video.getId(), line);
            }
        } catch (IOException e) {
            process.destroy();
            throw new ProcesamientoException("Error leyendo salida de Python: " + e.getMessage());
        }

        boolean terminoATiempo;
        try {
            terminoATiempo = process.waitFor(60, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroy();
            throw new ProcesamientoException("Interrupción esperando a Python");
        }

        if (!terminoATiempo) {
            process.destroy();
            throw new ProcesamientoException("Timeout: Python tardó más de 60 segundos extrayendo el frame");
        }

        if (process.exitValue() != 0) {
            String salida = String.join("\n", outputLines);
            throw new ProcesamientoException(
                    "Python finalizó con error (exit=" + process.exitValue() + "): " + salida);
        }

        Integer ancho = null;
        Integer alto = null;
        Integer duracionSegundos = null;

        for (String line : outputLines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("{")) {
                try {
                    JsonNode node = objectMapper.readTree(trimmed);
                    if (node.has("ancho")) ancho = node.get("ancho").asInt();
                    if (node.has("alto")) alto = node.get("alto").asInt();
                    if (node.has("duracion_seg")) duracionSegundos = node.get("duracion_seg").asInt();
                    break;
                } catch (Exception e) {
                    log.debug("Línea no parseable como JSON: {}", trimmed);
                }
            }
        }

        log.info("Frame extraído para video {}: {}", video.getId(), outputPng);
        return new FrameExtractionResult(outputPng, ancho, alto, duracionSegundos);
    }

    // ── Fase 2: detección completa con YOLO ──────────────────────────────────

    public DeteccionResult detectarCompleto(Video video, List<Zona> zonas,
                                            Path zonasJsonOutput, Path csvOutput) {
        Map<Integer, Long> mapaZonas = generarZonasJson(zonas, zonasJsonOutput);

        List<String> comando = List.of(
                pythonBin,
                scriptPath,
                "--video", video.getRutaArchivo(),
                "--zonas", zonasJsonOutput.toAbsolutePath().toString(),
                "--output", csvOutput.toAbsolutePath().toString(),
                "--conf", "0.45",
                "--modelo", "yolov8n",
                "--fps", "1"
        );

        log.info("Iniciando detección completa video {}: {}", video.getId(), String.join(" ", comando));

        Process process;
        try {
            ProcessBuilder pb = new ProcessBuilder(comando);
            pb.redirectErrorStream(true);
            process = pb.start();
        } catch (IOException e) {
            throw new ProcesamientoException("No se pudo iniciar proceso Python: " + e.getMessage());
        }

        List<String> outputLines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                outputLines.add(line);
                log.debug("Python [video={}]: {}", video.getId(), line);
            }
        } catch (IOException e) {
            process.destroy();
            throw new ProcesamientoException("Error leyendo salida de Python: " + e.getMessage());
        }

        boolean terminoATiempo;
        try {
            terminoATiempo = process.waitFor(10, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroy();
            throw new ProcesamientoException("Interrupción esperando a Python");
        }

        if (!terminoATiempo) {
            process.destroy();
            throw new ProcesamientoException("Timeout: Python tardó más de 10 minutos en la detección");
        }

        if (process.exitValue() != 0) {
            String salida = String.join("\n", outputLines);
            throw new ProcesamientoException(
                    "Python finalizó con error (exit=" + process.exitValue() + "): " + salida);
        }

        Integer framesProcesados = null;
        Integer deteccionesTotales = null;
        Integer duracionSeg = null;

        for (String line : outputLines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("{")) {
                try {
                    JsonNode node = objectMapper.readTree(trimmed);
                    if ("ERROR".equals(node.path("status").asText(null))) {
                        throw new ProcesamientoException("Python reportó error: " + trimmed);
                    }
                    if (node.has("frames_procesados")) framesProcesados = node.get("frames_procesados").asInt();
                    if (node.has("detecciones_totales")) deteccionesTotales = node.get("detecciones_totales").asInt();
                    if (node.has("duracion_seg")) duracionSeg = node.get("duracion_seg").asInt();
                    break;
                } catch (ProcesamientoException pe) {
                    throw pe;
                } catch (Exception e) {
                    log.debug("Línea no parseable como JSON: {}", trimmed);
                }
            }
        }

        log.info("Detección completa para video {}: {} frames, {} detecciones",
                video.getId(), framesProcesados, deteccionesTotales);
        return new DeteccionResult(framesProcesados, deteccionesTotales, duracionSeg, csvOutput, mapaZonas);
    }

    private Map<Integer, Long> generarZonasJson(List<Zona> zonas, Path destino) {
        Map<Integer, Long> mapaZonas = new LinkedHashMap<>();
        List<Map<String, Object>> lista = new ArrayList<>();

        for (int i = 0; i < zonas.size(); i++) {
            Zona z = zonas.get(i);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", i);
            item.put("x", z.getXNorm());
            item.put("y", z.getYNorm());
            item.put("ancho", z.getAnchoNorm());
            item.put("alto", z.getAltoNorm());
            lista.add(item);
            mapaZonas.put(i, z.getId());
        }

        try {
            Files.createDirectories(destino.getParent());
            objectMapper.writeValue(destino.toFile(), lista);
        } catch (IOException e) {
            throw new ProcesamientoException("No se pudo escribir el JSON de zonas: " + e.getMessage());
        }

        return mapaZonas;
    }
}
