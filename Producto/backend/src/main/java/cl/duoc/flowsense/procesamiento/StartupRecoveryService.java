package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.videos.EstadoVideo;
import cl.duoc.flowsense.videos.Video;
import cl.duoc.flowsense.videos.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class StartupRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(StartupRecoveryService.class);
    private static final int MINUTOS_TIMEOUT = 10;

    private final VideoRepository videoRepository;

    public StartupRecoveryService(VideoRepository videoRepository) {
        this.videoRepository = videoRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void recuperarVideosInterrumpidos() {
        List<Video> enProcesando = videoRepository.findByEstado(EstadoVideo.PROCESANDO);
        if (enProcesando.isEmpty()) {
            log.info("Recovery al startup: no se encontraron videos en estado PROCESANDO");
            return;
        }

        LocalDateTime limite = LocalDateTime.now().minusMinutes(MINUTOS_TIMEOUT);
        int recuperados = 0;

        for (Video video : enProcesando) {
            if (video.getFechaSubida().isBefore(limite)) {
                video.setEstado(EstadoVideo.ERROR);
                video.setMensajeError("Proceso interrumpido por reinicio del servidor");
                videoRepository.save(video);
                recuperados++;
                log.warn("Video {} marcado ERROR por reinicio (subido {})", video.getId(), video.getFechaSubida());
            }
        }

        if (recuperados > 0) {
            log.info("Recovery al startup: {} video(s) marcados como ERROR", recuperados);
        } else {
            log.info("Recovery al startup: {} video(s) en PROCESANDO aún dentro del timeout", enProcesando.size());
        }
    }
}
