package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.procesamiento.CsvParserService;
import cl.duoc.flowsense.procesamiento.DeteccionResult;
import cl.duoc.flowsense.procesamiento.FrameExtractionResult;
import cl.duoc.flowsense.procesamiento.MetricasCalculatorService;
import cl.duoc.flowsense.procesamiento.PythonOrchestratorService;
import cl.duoc.flowsense.recintos.Zona;
import cl.duoc.flowsense.recintos.ZonaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Component
public class VideoAsyncProcessor {

    private static final Logger log = LoggerFactory.getLogger(VideoAsyncProcessor.class);

    private final VideoRepository videoRepository;
    private final ZonaRepository zonaRepository;
    private final DeteccionRepository deteccionRepository;
    private final PythonOrchestratorService pythonOrchestrator;
    private final CsvParserService csvParser;
    private final MetricasCalculatorService metricasCalculator;
    private final String resultsDir;

    public VideoAsyncProcessor(
            VideoRepository videoRepository,
            ZonaRepository zonaRepository,
            DeteccionRepository deteccionRepository,
            PythonOrchestratorService pythonOrchestrator,
            CsvParserService csvParser,
            MetricasCalculatorService metricasCalculator,
            @Value("${app.results-dir}") String resultsDir) {
        this.videoRepository = videoRepository;
        this.zonaRepository = zonaRepository;
        this.deteccionRepository = deteccionRepository;
        this.pythonOrchestrator = pythonOrchestrator;
        this.csvParser = csvParser;
        this.metricasCalculator = metricasCalculator;
        this.resultsDir = resultsDir;
    }

    // ── Fase 1: extracción del frame representativo ───────────────────────────

    @Async("taskExecutor")
    public void extraerFrameAsync(Long idVideo) {
        try {
            Video video = videoRepository.findById(idVideo)
                    .orElseThrow(() -> new IllegalStateException("Video no encontrado: " + idVideo));

            FrameExtractionResult resultado = pythonOrchestrator.extraerFrame(video);

            video.setRutaFramePreview(resultado.pngPath().toAbsolutePath().toString());
            video.setAnchoFrame(resultado.ancho());
            video.setAltoFrame(resultado.alto());
            video.setDuracionSegundos(resultado.duracionSegundos());
            video.setEstado(EstadoVideo.FRAME_LISTO);
            video.setMensajeError(null);
            videoRepository.save(video);

            log.info("Extracción de frame completada para video {}", idVideo);
        } catch (Exception e) {
            log.error("Error extrayendo frame del video {}: {}", idVideo, e.getMessage());
            marcarError(idVideo, e.getMessage());
        }
    }

    // ── Fase 2: detección completa con YOLO ──────────────────────────────────

    @Async("taskExecutor")
    public void procesarDeteccionAsync(Long idVideo) {
        try {
            Video video = videoRepository.findByIdWithRecinto(idVideo)
                    .orElseThrow(() -> new IllegalStateException("Video no encontrado: " + idVideo));

            Long idRecinto = video.getRecinto().getId();
            List<Zona> zonas = zonaRepository.findByRecintoIdOrderByOrdenAsc(idRecinto);

            if (zonas.isEmpty()) {
                throw new IllegalStateException("No hay zonas definidas para el recinto");
            }

            Path csvDir = Paths.get(resultsDir, "csv");
            Path zonasDir = Paths.get(resultsDir, "zonas");
            Files.createDirectories(csvDir);
            Files.createDirectories(zonasDir);

            Path csvOutput = csvDir.resolve(UUID.randomUUID() + ".csv");
            Path zonasJson = zonasDir.resolve(UUID.randomUUID() + ".json");

            // Limpia detecciones previas para idempotencia (si se reprocesa)
            deteccionRepository.deleteByVideoId(idVideo);

            DeteccionResult resultado = pythonOrchestrator.detectarCompleto(video, zonas, zonasJson, csvOutput);

            int insertadas = csvParser.parsearYPersistir(resultado.csvPath(), video, resultado.mapaZonas());

            List<cl.duoc.flowsense.videos.Metrica> metricas =
                    metricasCalculator.calcularYPersistir(video, zonas);

            video.setEstado(EstadoVideo.COMPLETADO);
            video.setMensajeError(null);
            video.setFramesProcesados(resultado.framesProcesados());
            video.setDeteccionesTotales(insertadas);
            videoRepository.save(video);

            log.info("Análisis completado para video {}: {} detecciones, {} métricas",
                    idVideo, insertadas, metricas.size());
        } catch (Exception e) {
            log.error("Error en análisis del video {}: {}", idVideo, e.getMessage());
            marcarError(idVideo, e.getMessage());
        }
    }

    private void marcarError(Long idVideo, String mensaje) {
        try {
            videoRepository.findById(idVideo).ifPresent(v -> {
                v.setEstado(EstadoVideo.ERROR);
                v.setMensajeError(mensaje);
                videoRepository.save(v);
            });
        } catch (Exception saveEx) {
            log.error("No se pudo persistir el error del video {}: {}", idVideo, saveEx.getMessage());
        }
    }
}
