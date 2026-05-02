package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.exceptions.RecursoNoEncontradoException;
import cl.duoc.flowsense.common.exceptions.ValidacionException;
import cl.duoc.flowsense.recintos.Recinto;
import cl.duoc.flowsense.recintos.RecintoRepository;
import cl.duoc.flowsense.videos.dto.FramePreviewResponse;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
public class VideoService {

    private static final Logger log = LoggerFactory.getLogger(VideoService.class);
    private static final long MAX_SIZE_BYTES = 500L * 1024 * 1024;

    private final VideoRepository videoRepository;
    private final RecintoRepository recintoRepository;
    private final VideoAsyncProcessor asyncProcessor;
    private final String uploadDir;

    public VideoService(VideoRepository videoRepository,
                        RecintoRepository recintoRepository,
                        VideoAsyncProcessor asyncProcessor,
                        @Value("${app.upload-dir}") String uploadDir) {
        this.videoRepository = videoRepository;
        this.recintoRepository = recintoRepository;
        this.asyncProcessor = asyncProcessor;
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

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ValidacionException("El archivo no puede estar vacío");
        }
        String contentType = archivo.getContentType();
        if (contentType == null || !contentType.startsWith("video/")) {
            throw new ValidacionException("El archivo debe ser un video (content-type: video/*)");
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
