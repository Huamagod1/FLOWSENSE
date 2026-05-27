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

        Integer duracion = video.getDuracionSegundos();
        int frameSegundo;
        if (duracion == null || duracion <= 0) {
            frameSegundo = 2;
        } else {
            frameSegundo = Math.min(5, duracion - 1);
        }

        List<String> comando = List.of(
                pythonBin,
                scriptPath,
                "--modo", "extraer-frame",
                "--video", video.getRutaArchivo(),
                "--frame-output", outputPng.toAbsolutePath().toString(),
                "--frame-segundo", String.valueOf(frameSegundo)
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
        Map<Integer, Long> mapaZonas = generarZonasJson(video.getId(), zonas, zonasJsonOutput);

        String conf = video.getConfUsado() != null ? video.getConfUsado().toPlainString() : "0.45";
        String modelo = video.getModeloUsado() != null ? video.getModeloUsado() : "yolov8n";

        List<String> comando = List.of(
                pythonBin,
                scriptPath,
                "--video", video.getRutaArchivo(),
                "--zonas", zonasJsonOutput.toAbsolutePath().toString(),
                "--output", csvOutput.toAbsolutePath().toString(),
                "--conf", conf,
                "--modelo", modelo,
                "--fps", "10",
                "--tracker", "bytetrack"
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
        TrackingData trackingData = null;
        ConfiabilidadData confiabilidadData = null;

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
                    trackingData = parsearTrackingData(node);
                    confiabilidadData = parsearConfiabilidad(node);
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
        return new DeteccionResult(framesProcesados, deteccionesTotales, duracionSeg, csvOutput, mapaZonas,
                trackingData, confiabilidadData);
    }

    private TrackingData parsearTrackingData(JsonNode node) {
        if (!node.has("metricas_por_zona")) return null;

        Integer personasUnicasTotal = node.has("personas_unicas_total")
                ? node.get("personas_unicas_total").asInt() : null;
        Double permanenciaGlobal = node.has("tiempo_permanencia_promedio_global")
                ? node.get("tiempo_permanencia_promedio_global").asDouble() : null;

        List<TrackingData.FlujoZona> flujoList = new ArrayList<>();
        JsonNode flujoNode = node.path("flujo_entre_zonas");
        if (flujoNode.isArray()) {
            for (JsonNode f : flujoNode) {
                flujoList.add(new TrackingData.FlujoZona(
                        f.get("zona_origen").asInt(),
                        f.get("zona_destino").asInt(),
                        f.get("conteo").asInt()));
            }
        }

        Map<Integer, TrackingData.ZoneMetrics> metricasPorZona = new java.util.LinkedHashMap<>();
        JsonNode mpz = node.get("metricas_por_zona");
        mpz.fields().forEachRemaining(entry -> {
            int pyZoneIdx = Integer.parseInt(entry.getKey());
            JsonNode zm = entry.getValue();
            Double velocidad = zm.has("velocidad_flujo_promedio")
                    ? zm.get("velocidad_flujo_promedio").asDouble() : null;
            metricasPorZona.put(pyZoneIdx, new TrackingData.ZoneMetrics(
                    zm.path("personas_unicas").asInt(0),
                    zm.path("tiempo_permanencia_promedio").asDouble(0.0),
                    zm.path("entradas").asInt(0),
                    zm.path("salidas").asInt(0),
                    zm.path("ots_tracking").asDouble(0.0),
                    velocidad
            ));
        });

        return new TrackingData(personasUnicasTotal, permanenciaGlobal, flujoList, metricasPorZona);
    }

    private ConfiabilidadData parsearConfiabilidad(JsonNode node) {
        JsonNode conf = node.path("confiabilidad");
        String overlayPath = node.has("video_overlay_path")
                ? node.get("video_overlay_path").asText(null) : null;
        if (conf.isMissingNode() && overlayPath == null) return null;

        Double confianza = conf.has("confianza_promedio") ? conf.get("confianza_promedio").asDouble() : null;
        Double calidad   = conf.has("calidad_tracking")  ? conf.get("calidad_tracking").asDouble()  : null;
        Double score     = conf.has("score_global")      ? conf.get("score_global").asDouble()      : null;
        String nivel     = conf.has("nivel")             ? conf.get("nivel").asText(null)           : null;

        // eventos JSON es co-ubicado con el overlay: misma ruta, extensión distinta
        String eventosPath = (overlayPath != null)
                ? overlayPath.replace("_overlay.mp4", "_eventos.json") : null;

        return new ConfiabilidadData(confianza, calidad, score, nivel, overlayPath, eventosPath);
    }

    private Map<Integer, Long> generarZonasJson(Long idVideo, List<Zona> zonas, Path destino) {
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

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id_video", idVideo);
        payload.put("zonas", lista);

        try {
            Files.createDirectories(destino.getParent());
            objectMapper.writeValue(destino.toFile(), payload);
        } catch (IOException e) {
            throw new ProcesamientoException("No se pudo escribir el JSON de zonas: " + e.getMessage());
        }

        return mapaZonas;
    }
}
