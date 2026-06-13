package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.exceptions.ConflictException;
import cl.duoc.flowsense.common.exceptions.RecursoNoEncontradoException;
import cl.duoc.flowsense.common.exceptions.ValidacionException;
import cl.duoc.flowsense.recintos.Recinto;
import cl.duoc.flowsense.recintos.RecintoRepository;
import cl.duoc.flowsense.videos.dto.ConfiabilidadResponse;
import cl.duoc.flowsense.videos.dto.DeteccionHeatmapPoint;
import cl.duoc.flowsense.videos.dto.EstadoVideoResponse;
import cl.duoc.flowsense.videos.dto.EventoDto;
import cl.duoc.flowsense.videos.dto.EventosResponse;
import cl.duoc.flowsense.videos.dto.FramePreviewResponse;
import cl.duoc.flowsense.videos.dto.TrayectoriaDto;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class VideoService {

    private static final Logger log = LoggerFactory.getLogger(VideoService.class);
    private static final long MAX_SIZE_BYTES = 500L * 1024 * 1024;

    private final VideoRepository videoRepository;
    private final RecintoRepository recintoRepository;
    private final DeteccionRepository deteccionRepository;
    private final VideoAsyncProcessor asyncProcessor;
    private final ObjectMapper objectMapper;
    private final String uploadDir;

    public VideoService(VideoRepository videoRepository,
                        RecintoRepository recintoRepository,
                        DeteccionRepository deteccionRepository,
                        VideoAsyncProcessor asyncProcessor,
                        ObjectMapper objectMapper,
                        @Value("${app.upload-dir}") String uploadDir) {
        this.videoRepository = videoRepository;
        this.recintoRepository = recintoRepository;
        this.deteccionRepository = deteccionRepository;
        this.asyncProcessor = asyncProcessor;
        this.objectMapper = objectMapper;
        this.uploadDir = uploadDir;
    }

    public VideoResponse subirVideo(Long idRecinto, MultipartFile archivo, Long idOrg) {
        Recinto recinto = recintoRepository.findByIdAndOrganizacionId(idRecinto, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Recinto no encontrado"));

        validarArchivo(archivo);

        String nombreSanitizado = sanitizarNombre(archivo.getOriginalFilename());
        String nombreUnico = UUID.randomUUID() + "_" + nombreSanitizado;

        Path dirRecinto = Paths.get(uploadDir, String.valueOf(idRecinto));
        Path rutaDestino = dirRecinto.resolve(nombreUnico);

        try {
            Files.createDirectories(dirRecinto);
        } catch (IOException e) {
            throw new ValidacionException("No se pudo preparar el directorio de subida: " + e.getMessage());
        }

        try {
            Files.copy(archivo.getInputStream(), rutaDestino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            borrarSilencioso(rutaDestino);
            throw new ValidacionException("Error guardando el archivo en disco: " + e.getMessage());
        }

        Video video;
        try {
            video = Video.builder()
                    .recinto(recinto)
                    .nombreArchivo(archivo.getOriginalFilename())
                    .rutaArchivo(rutaDestino.toAbsolutePath().toString())
                    .tamanoBytes(archivo.getSize())
                    .estado(EstadoVideo.PENDIENTE)
                    .build();
            video = videoRepository.save(video);
        } catch (Exception e) {
            borrarSilencioso(rutaDestino);
            throw e;
        }

        asyncProcessor.extraerFrameAsync(video.getId());

        log.info("Video {} subido para recinto {} (org {})", video.getId(), idRecinto, idOrg);
        return VideoResponse.from(video);
    }

    @Transactional(readOnly = true)
    public VideoResponse obtener(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        return VideoResponse.from(video);
    }

    @Transactional(readOnly = true)
    public EstadoVideoResponse obtenerEstado(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        return EstadoVideoResponse.builder()
                .id(video.getId())
                .estado(video.getEstado())
                .mensajeError(video.getMensajeError())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DeteccionHeatmapPoint> listarDeteccionesHeatmap(Long idVideo, Long idOrg) {
        videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        List<Object[]> rows = deteccionRepository.findHeatmapRawByVideoId(idVideo);
        return rows.stream()
                .map(row -> DeteccionHeatmapPoint.builder()
                        .x(toBigDecimal(row[0]))
                        .y(toBigDecimal(row[1]))
                        .zonaId(row[2] != null ? ((Number) row[2]).longValue() : null)
                        .build())
                .toList();
    }

    @Transactional
    public void eliminar(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        if (video.getEstado() == EstadoVideo.PROCESANDO) {
            throw new ConflictException("No se puede eliminar un video en procesamiento");
        }

        borrarSilencioso(Paths.get(video.getRutaArchivo()));
        if (video.getRutaFramePreview() != null) {
            borrarSilencioso(Paths.get(video.getRutaFramePreview()));
        }

        videoRepository.delete(video);
        log.info("Video {} eliminado (org {})", idVideo, idOrg);
    }

    @Transactional(readOnly = true)
    public List<TrayectoriaDto> listarTrayectorias(Long idVideo, Long idOrg) {
        videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        List<Object[]> rows = deteccionRepository.findTrayectoriasRawByVideoId(idVideo);

        // Filas ordenadas por track_id, frame_numero: se agrupan por track
        // preservando el orden temporal del recorrido.
        Map<Integer, List<TrayectoriaDto.PuntoTrayectoria>> porTrack = new LinkedHashMap<>();
        for (Object[] row : rows) {
            Integer trackId = ((Number) row[0]).intValue();
            TrayectoriaDto.PuntoTrayectoria punto =
                    new TrayectoriaDto.PuntoTrayectoria(toBigDecimal(row[1]), toBigDecimal(row[2]));
            porTrack.computeIfAbsent(trackId, k -> new ArrayList<>()).add(punto);
        }

        return porTrack.entrySet().stream()
                .map(e -> new TrayectoriaDto(e.getKey(), e.getValue()))
                .toList();
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public List<VideoResponse> listarPorRecinto(Long idRecinto, Long idOrg) {
        if (!recintoRepository.existsByIdAndOrganizacionId(idRecinto, idOrg)) {
            throw new RecursoNoEncontradoException("Recinto no encontrado");
        }
        return videoRepository.findByRecintoIdOrderByFechaSubidaDesc(idRecinto)
                .stream()
                .map(VideoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FramePreviewResponse obtenerFramePreview(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        if (video.getEstado() != EstadoVideo.FRAME_LISTO
                && video.getEstado() != EstadoVideo.ESPERANDO_ZONAS
                && video.getEstado() != EstadoVideo.COMPLETADO) {
            throw new ValidacionException("El frame aún no está disponible (estado: " + video.getEstado() + ")");
        }

        return FramePreviewResponse.builder()
                .idVideo(video.getId())
                .urlFrame("/api/videos/" + video.getId() + "/frame-preview/imagen")
                .anchoFrame(video.getAnchoFrame())
                .altoFrame(video.getAltoFrame())
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] servirImagenFrame(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        if (video.getRutaFramePreview() == null) {
            throw new RecursoNoEncontradoException("Frame preview no disponible para este video");
        }

        Path rutaFrame = Paths.get(video.getRutaFramePreview());
        try {
            return Files.readAllBytes(rutaFrame);
        } catch (NoSuchFileException e) {
            throw new RecursoNoEncontradoException("Archivo de frame no encontrado en disco");
        } catch (IOException e) {
            throw new ValidacionException("Error leyendo el frame: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public ConfiabilidadResponse obtenerConfiabilidad(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        return ConfiabilidadResponse.builder()
                .confianzaPromedio(video.getConfianzaPromedio())
                .calidadTracking(video.getCalidadTracking())
                .scoreConfiabilidad(video.getScoreConfiabilidad())
                .nivelConfiabilidad(video.getNivelConfiabilidad())
                .overlayDisponible(video.getVideoOverlayPath() != null)
                .videoOriginalDisponible(video.getVideoOriginalDisponible())
                .duracionOriginalSeg(video.getDuracionSegundos())
                .build();
    }

    @Transactional(readOnly = true)
    public Resource servirVideoOverlay(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        if (video.getVideoOverlayPath() == null) {
            throw new RecursoNoEncontradoException("Video con overlay no disponible para este análisis");
        }
        Path overlayPath = Paths.get(video.getVideoOverlayPath());
        if (!Files.exists(overlayPath)) {
            throw new RecursoNoEncontradoException("Archivo de overlay no encontrado en disco");
        }
        return new FileSystemResource(overlayPath);
    }

    @Transactional(readOnly = true)
    public EventosResponse obtenerEventos(Long idVideo, Long idOrg, Integer desde, Integer hasta) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        if (video.getEventosJsonPath() == null) {
            throw new RecursoNoEncontradoException("Eventos no disponibles para este análisis");
        }
        Path jsonPath = Paths.get(video.getEventosJsonPath());
        if (!Files.exists(jsonPath)) {
            throw new RecursoNoEncontradoException("Archivo de eventos no encontrado en disco");
        }

        List<EventoDto> todos = new ArrayList<>();
        try {
            JsonNode array = objectMapper.readTree(jsonPath.toFile());
            for (JsonNode item : array) {
                todos.add(new EventoDto(
                        item.path("tiempo").asDouble(),
                        item.path("frame").asInt(),
                        item.path("track_id").asInt(),
                        item.path("tipo").asText(),
                        item.path("zona_id").asInt(),
                        item.path("confianza").asDouble(),
                        item.path("x_norm").asDouble(),
                        item.path("y_norm").asDouble()
                ));
            }
        } catch (IOException e) {
            throw new ValidacionException("Error leyendo el archivo de eventos: " + e.getMessage());
        }

        List<EventoDto> filtrados = todos;
        if (desde != null || hasta != null) {
            int d = desde != null ? desde : 0;
            int h = hasta != null ? hasta : Integer.MAX_VALUE;
            filtrados = todos.stream()
                    .filter(e -> e.frame() >= d && e.frame() <= h)
                    .toList();
        }

        // sin rango: exploración rápida (100); con rango explícito: análisis completo (20000)
        List<EventoDto> pagina = filtrados.stream()
                .limit((desde == null && hasta == null) ? 100 : 20000)
                .toList();

        return EventosResponse.builder()
                .eventos(pagina)
                .total(filtrados.size())
                .desde(desde)
                .hasta(hasta)
                .build();
    }

    @Transactional
    public void eliminarVideoOriginal(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdAndRecintoOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));
        if (video.getEstado() == EstadoVideo.PROCESANDO) {
            throw new ConflictException("No se puede eliminar el video mientras está siendo procesado");
        }
        borrarSilencioso(Paths.get(video.getRutaArchivo()));
        if (video.getVideoOverlayPath() != null) {
            borrarSilencioso(Paths.get(video.getVideoOverlayPath()));
        }
        video.setVideoOriginalDisponible(false);
        video.setVideoOverlayPath(null);
        video.setEventosJsonPath(null);
        videoRepository.save(video);
        log.info("Video original y overlay eliminados para video {} (org {})", idVideo, idOrg);
    }

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ValidacionException("El archivo no puede estar vacío");
        }
        String contentType = archivo.getContentType();
        if (contentType == null
                || (!contentType.equals("video/mp4") && !contentType.equals("application/octet-stream"))) {
            throw new ValidacionException("El archivo debe ser un video MP4");
        }
        if (archivo.getSize() > MAX_SIZE_BYTES) {
            throw new ValidacionException("El archivo supera el tamaño máximo permitido de 500 MB");
        }
    }

    private String sanitizarNombre(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "video.mp4";
        }
        // Extrae solo el filename (elimina ../ y rutas)
        String soloNombre = Paths.get(nombre).getFileName().toString();
        // Solo alfanuméricos, guiones, underscores y puntos
        String limpio = soloNombre.replaceAll("[^a-zA-Z0-9\\-_.]", "_");
        if (!limpio.toLowerCase().endsWith(".mp4")) {
            limpio = limpio + ".mp4";
        }
        return limpio;
    }

    private void borrarSilencioso(Path ruta) {
        try {
            Files.deleteIfExists(ruta);
        } catch (Exception e) {
            log.warn("No se pudo borrar archivo huérfano {}: {}", ruta, e.getMessage());
        }
    }
}
