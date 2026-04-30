package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.common.security.CurrentUser;
import cl.duocuc.flowsense.backend.procesamiento.CsvParserService;
import cl.duocuc.flowsense.backend.procesamiento.MetricasCalculatorService;
import cl.duocuc.flowsense.backend.procesamiento.PythonOrchestratorService;
import cl.duocuc.flowsense.backend.recintos.Recinto;
import cl.duocuc.flowsense.backend.recintos.RecintoRepository;
import cl.duocuc.flowsense.backend.recintos.Zona;
import cl.duocuc.flowsense.backend.recintos.ZonaRepository;
import cl.duocuc.flowsense.backend.videos.dto.VideoResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoService {
    private final VideoRepository videoRepository;
    private final RecintoRepository recintoRepository;
    private final ZonaRepository zonaRepository;
    private final DeteccionRepository deteccionRepository;
    private final MetricaRepository metricaRepository;
    private final PythonOrchestratorService pythonOrchestratorService;
    private final CsvParserService csvParserService;
    private final MetricasCalculatorService metricasCalculatorService;
    private final CurrentUser currentUser;

    @Value("${upload.dir:uploads/}")
    private String uploadDir;

    @Value("${results.dir:results/}")
    private String resultsDir;

    public List<VideoResponse> listarPorRecinto(Long recintoId) {
        recintoRepository.findByIdAndOrganizacionId(recintoId, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));
        
        return videoRepository.findByRecintoIdOrderByFechaSubidaDesc(recintoId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public VideoResponse obtenerPorId(Long id) {
        return videoRepository.findByIdAndRecintoOrganizacionId(id, currentUser.getOrganizacionId())
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Video no encontrado"));
    }

    @Transactional
    public VideoResponse subirVideo(Long recintoId, MultipartFile file) throws IOException {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(recintoId, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Recinto no encontrado"));

        Files.createDirectories(Paths.get(uploadDir));
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir, fileName);
        Files.copy(file.getInputStream(), filePath);

        Video video = Video.builder()
                .nombreOriginal(file.getOriginalFilename())
                .ruta(filePath.toString())
                .recinto(recinto)
                .estado(Video.EstadoVideo.PENDIENTE)
                .build();
        
        video = videoRepository.save(video);

        // Extraer frame asincrónicamente o sincrónicamente (depende de la UX)
        try {
            String framePath = pythonOrchestratorService.extraerFrame(video);
            video.setRutaFramePreview(framePath);
            video.setEstado(Video.EstadoVideo.FRAME_LISTO);
            video = videoRepository.save(video);
        } catch (Exception e) {
            log.error("Error extrayendo frame para video {}", video.getId(), e);
            video.setEstado(Video.EstadoVideo.ERROR);
            video.setMensajeError("Error extrayendo frame: " + e.getMessage());
            videoRepository.save(video);
        }

        return mapToResponse(video);
    }

    @Transactional
    public void iniciarProcesamiento(Long id) throws IOException {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(id, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Video no encontrado"));

        if (video.getEstado() != Video.EstadoVideo.FRAME_LISTO && video.getEstado() != Video.EstadoVideo.ESPERANDO_ZONAS) {
            throw new RuntimeException("El video no está listo para procesamiento");
        }

        List<Zona> zonas = zonaRepository.findByRecintoId(video.getRecinto().getId());
        if (zonas.isEmpty()) {
            throw new RuntimeException("No hay zonas definidas para este recinto");
        }

        // Crear JSON de zonas para Python
        Files.createDirectories(Paths.get(resultsDir));
        String zonasJsonPath = resultsDir + "zonas_" + video.getId() + ".json";
        ObjectMapper mapper = new ObjectMapper();
        try (FileWriter writer = new FileWriter(zonasJsonPath)) {
            mapper.writeValue(writer, zonas);
        }

        pythonOrchestratorService.procesarVideo(video, zonasJsonPath)
            .thenRun(() -> finalizeProcessing(id));
    }

    @Transactional
    public void finalizeProcessing(Long videoId) {
        Video video = videoRepository.findById(videoId).orElseThrow();
        if (video.getEstado() == Video.EstadoVideo.ERROR) return;

        String csvPath = resultsDir + video.getId() + "_detecciones.csv";
        List<Deteccion> detecciones = csvParserService.parseDetecciones(csvPath, video);
        
        deteccionRepository.deleteByVideoId(video.getId());
        deteccionRepository.saveAll(detecciones);

        List<Metrica> metricas = metricasCalculatorService.calcularMetricas(video, detecciones);
        metricaRepository.deleteByVideoId(video.getId());
        metricaRepository.saveAll(metricas);

        video.setEstado(Video.EstadoVideo.COMPLETADO);
        video.setFechaCompletado(LocalDateTime.now());
        videoRepository.save(video);
    }

    private VideoResponse mapToResponse(Video video) {
        return VideoResponse.builder()
                .id(video.getId())
                .nombreOriginal(video.getNombreOriginal())
                .estado(video.getEstado())
                .rutaFramePreview(video.getRutaFramePreview())
                .confUsado(video.getConfUsado())
                .framesProcesados(video.getFramesProcesados())
                .fechaSubida(video.getFechaSubida())
                .fechaCompletado(video.getFechaCompletado())
                .mensajeError(video.getMensajeError())
                .build();
    }
}
