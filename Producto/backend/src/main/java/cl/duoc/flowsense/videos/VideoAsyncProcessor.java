package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.procesamiento.FrameExtractionResult;
import cl.duoc.flowsense.procesamiento.PythonOrchestratorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class VideoAsyncProcessor {

    private static final Logger log = LoggerFactory.getLogger(VideoAsyncProcessor.class);

    private final VideoRepository videoRepository;
    private final PythonOrchestratorService pythonOrchestrator;

    public VideoAsyncProcessor(VideoRepository videoRepository,
                                PythonOrchestratorService pythonOrchestrator) {
        this.videoRepository = videoRepository;
        this.pythonOrchestrator = pythonOrchestrator;
    }

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
            try {
                videoRepository.findById(idVideo).ifPresent(v -> {
                    v.setEstado(EstadoVideo.ERROR);
                    v.setMensajeError(e.getMessage());
                    videoRepository.save(v);
                });
            } catch (Exception saveEx) {
                log.error("No se pudo persistir el error del video {}: {}", idVideo, saveEx.getMessage());
            }
        }
    }
}
