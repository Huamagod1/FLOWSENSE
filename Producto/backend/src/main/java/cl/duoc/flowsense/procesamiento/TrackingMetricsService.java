package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.videos.FlujoEntreZonas;
import cl.duoc.flowsense.videos.FlujoEntreZonasRepository;
import cl.duoc.flowsense.videos.MetricaTracking;
import cl.duoc.flowsense.videos.MetricaTrackingRepository;
import cl.duoc.flowsense.videos.Track;
import cl.duoc.flowsense.videos.TrackRepository;
import cl.duoc.flowsense.videos.Video;
import cl.duoc.flowsense.videos.dto.FlujoZonasDto;
import cl.duoc.flowsense.videos.dto.MetricaTrackingResponse;
import cl.duoc.flowsense.videos.dto.TrackDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TrackingMetricsService {

    private static final Logger log = LoggerFactory.getLogger(TrackingMetricsService.class);

    private final JdbcTemplate jdbcTemplate;
    private final TrackRepository trackRepository;
    private final FlujoEntreZonasRepository flujoRepository;
    private final MetricaTrackingRepository metricaTrackingRepository;

    public TrackingMetricsService(JdbcTemplate jdbcTemplate,
                                  TrackRepository trackRepository,
                                  FlujoEntreZonasRepository flujoRepository,
                                  MetricaTrackingRepository metricaTrackingRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.trackRepository = trackRepository;
        this.flujoRepository = flujoRepository;
        this.metricaTrackingRepository = metricaTrackingRepository;
    }

    @Transactional
    public void persistirTracking(Video video, Map<Integer, Long> mapaZonas, TrackingData trackingData) {
        Long idVideo = video.getId();

        trackRepository.deleteByVideoId(idVideo);
        flujoRepository.deleteByVideoId(idVideo);
        metricaTrackingRepository.deleteByVideoId(idVideo);

        persistirTracks(video, idVideo);
        persistirFlujoEntreZonas(video, mapaZonas, trackingData);
        actualizarMetricasConTracking(idVideo, mapaZonas, trackingData);

        log.info("Métricas de tracking persistidas para video {}", idVideo);
    }

    // ── Consultas de lectura ─────────────────────────────────────────────────

    public List<TrackDto> listarTracks(Long idVideo) {
        return trackRepository.findByVideoIdOrderBySegundosTotalDesc(idVideo)
                .stream()
                .map(TrackDto::from)
                .toList();
    }

    public List<FlujoZonasDto> listarFlujoZonas(Long idVideo) {
        return flujoRepository.findByVideoIdOrderByConteoTracksDesc(idVideo)
                .stream()
                .map(FlujoZonasDto::from)
                .toList();
    }

    public List<MetricaTrackingResponse> listarMetricasTracking(Long idVideo) {
        return metricaTrackingRepository.findByVideoIdOrderByIdZonaAscSegundosDesc(idVideo)
                .stream()
                .map(MetricaTrackingResponse::from)
                .toList();
    }

    // ── Internos ─────────────────────────────────────────────────────────────

    private void persistirTracks(Video video, Long idVideo) {
        List<Track> tracks = new ArrayList<>();

        jdbcTemplate.query(
                "SELECT track_id, MIN(frame_numero) AS primer_frame, MAX(frame_numero) AS ultimo_frame, " +
                "COUNT(*) AS frames_total, " +
                "(SELECT id_zona FROM DETECCIONES d2 WHERE d2.id_video = d.id_video AND d2.track_id = d.track_id " +
                " ORDER BY frame_numero ASC LIMIT 1) AS zona_inicio_id, " +
                "(SELECT id_zona FROM DETECCIONES d2 WHERE d2.id_video = d.id_video AND d2.track_id = d.track_id " +
                " ORDER BY frame_numero DESC LIMIT 1) AS zona_fin_id " +
                "FROM DETECCIONES d WHERE id_video = ? AND track_id >= 0 " +
                "GROUP BY id_video, track_id",
                (RowCallbackHandler) rs -> tracks.add(Track.builder()
                        .video(video)
                        .trackId(rs.getInt("track_id"))
                        .zonaInicioId(rs.getObject("zona_inicio_id") != null ? rs.getLong("zona_inicio_id") : null)
                        .zonaFinId(rs.getObject("zona_fin_id") != null ? rs.getLong("zona_fin_id") : null)
                        .primerFrame(rs.getInt("primer_frame"))
                        .ultimoFrame(rs.getInt("ultimo_frame"))
                        .framesTotal(rs.getInt("frames_total"))
                        .segundosTotal((double) rs.getInt("frames_total"))
                        .build()),
                idVideo);

        if (!tracks.isEmpty()) {
            trackRepository.saveAll(tracks);
            log.debug("Tracks persistidos para video {}: {}", idVideo, tracks.size());
        }
    }

    private void persistirFlujoEntreZonas(Video video, Map<Integer, Long> mapaZonas, TrackingData trackingData) {
        if (trackingData == null || trackingData.flujoEntreZonas() == null
                || trackingData.flujoEntreZonas().isEmpty()) return;

        List<FlujoEntreZonas> flujos = new ArrayList<>();
        for (TrackingData.FlujoZona f : trackingData.flujoEntreZonas()) {
            Long idZonaOrigen = mapaZonas.get(f.zonaOrigen());
            Long idZonaDestino = mapaZonas.get(f.zonaDestino());
            if (idZonaOrigen == null || idZonaDestino == null) continue;
            flujos.add(FlujoEntreZonas.builder()
                    .video(video)
                    .zonaOrigenId(idZonaOrigen)
                    .zonaDestinoId(idZonaDestino)
                    .conteoTracks(f.conteo())
                    .build());
        }

        if (!flujos.isEmpty()) {
            flujoRepository.saveAll(flujos);
            log.debug("Flujo entre zonas persistido para video {}: {} transiciones", video.getId(), flujos.size());
        }
    }

    private void actualizarMetricasConTracking(Long idVideo, Map<Integer, Long> mapaZonas,
                                               TrackingData trackingData) {
        if (trackingData == null || trackingData.metricasPorZona() == null) return;

        for (Map.Entry<Integer, TrackingData.ZoneMetrics> entry : trackingData.metricasPorZona().entrySet()) {
            Long idZona = mapaZonas.get(entry.getKey());
            if (idZona == null) continue;
            TrackingData.ZoneMetrics zm = entry.getValue();
            jdbcTemplate.update(
                    "UPDATE METRICAS SET entradas = ?, salidas = ?, velocidad_flujo_prom = ? " +
                    "WHERE id_video = ? AND id_zona = ?",
                    zm.entradas(), zm.salidas(), zm.velocidadFlujoProm(), idVideo, idZona);
        }
    }
}
