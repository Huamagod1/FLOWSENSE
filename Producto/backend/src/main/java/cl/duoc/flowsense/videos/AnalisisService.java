package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.exceptions.RecursoNoEncontradoException;
import cl.duoc.flowsense.common.exceptions.ValidacionException;
import cl.duoc.flowsense.recintos.ZonaService;
import cl.duoc.flowsense.recintos.dto.ZonasGuardarRequest;
import cl.duoc.flowsense.videos.dto.GuardarZonasYProcesarRequest;
import cl.duoc.flowsense.videos.dto.MetricaResponse;
import cl.duoc.flowsense.videos.dto.PrecioSugeridoZona;
import cl.duoc.flowsense.videos.dto.ResumenAnalisisResponse;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class AnalisisService {

    private static final Logger log = LoggerFactory.getLogger(AnalisisService.class);

    private static final List<EstadoVideo> ESTADOS_PERMITIDOS_PARA_PROCESAR = List.of(
            EstadoVideo.FRAME_LISTO,
            EstadoVideo.ESPERANDO_ZONAS,
            EstadoVideo.COMPLETADO,
            EstadoVideo.ERROR
    );

    private final VideoRepository videoRepository;
    private final MetricaRepository metricaRepository;
    private final ZonaService zonaService;
    private final VideoAsyncProcessor asyncProcessor;

    public AnalisisService(VideoRepository videoRepository,
                           MetricaRepository metricaRepository,
                           ZonaService zonaService,
                           VideoAsyncProcessor asyncProcessor) {
        this.videoRepository = videoRepository;
        this.metricaRepository = metricaRepository;
        this.zonaService = zonaService;
        this.asyncProcessor = asyncProcessor;
    }

    public VideoResponse guardarZonasYProcesar(Long idVideo,
                                               GuardarZonasYProcesarRequest request,
                                               Long idOrg) {
        // Carga video + recinto de forma eager (necesitamos idRecinto para guardar zonas)
        Video video = videoRepository.findByIdWithRecintoAndOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        if (!ESTADOS_PERMITIDOS_PARA_PROCESAR.contains(video.getEstado())) {
            throw new ValidacionException(
                    "El video no está en un estado válido para procesar (estado actual: " + video.getEstado() + ")");
        }

        Long idRecinto = video.getRecinto().getId();

        // Guarda las zonas (su propio @Transactional — commit inmediato)
        ZonasGuardarRequest zonasReq = new ZonasGuardarRequest();
        zonasReq.setZonas(request.getZonas());
        zonaService.guardarZonas(idRecinto, zonasReq, idOrg);

        // Actualiza estado a PROCESANDO (commit inmediato antes del async)
        video.setEstado(EstadoVideo.PROCESANDO);
        video.setMensajeError(null);
        video = videoRepository.save(video);

        // Lanza análisis asíncrono (el video ya está committed en PROCESANDO)
        asyncProcessor.procesarDeteccionAsync(idVideo);

        log.info("Análisis lanzado para video {} (recinto {})", idVideo, idRecinto);
        return VideoResponse.from(video);
    }

    public ResumenAnalisisResponse obtenerResumen(Long idVideo, Long idOrg) {
        Video video = videoRepository.findByIdWithRecintoAndOrganizacionId(idVideo, idOrg)
                .orElseThrow(() -> new RecursoNoEncontradoException("Video no encontrado"));

        if (video.getEstado() != EstadoVideo.COMPLETADO) {
            throw new ValidacionException(
                    "El análisis aún no ha completado (estado actual: " + video.getEstado() + ")");
        }

        List<Metrica> metricas = metricaRepository
                .findByVideoIdWithZonaOrderByTotalDeteccionesDesc(idVideo);

        List<MetricaResponse> metricasDto = metricas.stream()
                .map(MetricaResponse::from)
                .toList();

        Integer precioBase = video.getRecinto().getPrecioBaseClp();
        List<PrecioSugeridoZona> preciosSugeridos = metricas.stream()
                .map(m -> calcularPrecioSugerido(m, precioBase))
                .toList();

        return ResumenAnalisisResponse.builder()
                .idVideo(video.getId())
                .estado(video.getEstado())
                .framesProcesados(video.getFramesProcesados())
                .deteccionesTotales(video.getDeteccionesTotales())
                .duracionSegundos(video.getDuracionSegundos())
                .fechaCalculo(metricas.isEmpty() ? null : metricas.get(0).getFechaCalculo())
                .metricas(metricasDto)
                .precioBaseClp(precioBase)
                .preciosSugeridos(preciosSugeridos)
                .build();
    }

    private PrecioSugeridoZona calcularPrecioSugerido(Metrica metrica, Integer precioBase) {
        Integer precioSugerido = null;
        if (precioBase != null) {
            precioSugerido = metrica.getIndiceValorRelativo()
                    .multiply(BigDecimal.valueOf(precioBase))
                    .setScale(0, RoundingMode.HALF_UP)
                    .intValue();
        }
        return PrecioSugeridoZona.builder()
                .idZona(metrica.getZona().getId())
                .nombreZona(metrica.getZona().getNombre())
                .indiceValorRelativo(metrica.getIndiceValorRelativo())
                .precioSugeridoClp(precioSugerido)
                .build();
    }
}
