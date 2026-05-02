package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.recintos.Zona;
import cl.duoc.flowsense.videos.Metrica;
import cl.duoc.flowsense.videos.MetricaRepository;
import cl.duoc.flowsense.videos.Video;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MetricasCalculatorService {

    private static final Logger log = LoggerFactory.getLogger(MetricasCalculatorService.class);

    private final JdbcTemplate jdbcTemplate;
    private final MetricaRepository metricaRepository;

    public MetricasCalculatorService(JdbcTemplate jdbcTemplate, MetricaRepository metricaRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.metricaRepository = metricaRepository;
    }

    @Transactional
    public List<Metrica> calcularYPersistir(Video video, List<Zona> zonas) {
        Long idVideo = video.getId();

        metricaRepository.deleteByVideoId(idVideo);

        long totalVideo = contarDeteccionesVideo(idVideo);
        long totalFrames = contarFramesDistintos(idVideo);
        int numZonas = zonas.size();

        Map<Long, ZoneAgg> aggPorZona = obtenerAgregadosPorZona(idVideo);
        Map<Long, Integer> picoPorZona = obtenerPicoMaximoPorZona(idVideo);

        List<Metrica> metricas = new ArrayList<>();
        for (Zona zona : zonas) {
            ZoneAgg agg = aggPorZona.getOrDefault(zona.getId(), ZoneAgg.EMPTY);
            long totalZona = agg.total();

            BigDecimal areaZona = zona.getAnchoNorm().multiply(zona.getAltoNorm())
                    .setScale(6, RoundingMode.HALF_UP);

            Metrica m = Metrica.builder()
                    .video(video)
                    .zona(zona)
                    .totalDetecciones((int) totalZona)
                    .porcentajeDelTotal(calcPorcentaje(totalZona, totalVideo))
                    .densidadPromedio(calcDensidad(totalZona, totalFrames))
                    .picoMaximo(picoPorZona.getOrDefault(zona.getId(), 0))
                    .framesConActividad((int) agg.framesActivos())
                    .confianzaPromedio(agg.confProm())
                    .areaZona(areaZona)
                    .densidadPorArea(calcDensidadPorArea(totalZona, areaZona))
                    .indiceValorRelativo(calcIndice(totalZona, totalVideo, numZonas))
                    .build();

            metricas.add(m);
        }

        List<Metrica> guardadas = metricaRepository.saveAll(metricas);
        log.info("Métricas calculadas para video {}: {} zonas, {} detecciones totales",
                idVideo, zonas.size(), totalVideo);
        return guardadas;
    }

    // ── Queries SQL agregadas — nunca carga filas de DETECCIONES en memoria ──

    private long contarDeteccionesVideo(Long idVideo) {
        Long resultado = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM DETECCIONES WHERE id_video = ?",
                Long.class, idVideo);
        return resultado != null ? resultado : 0L;
    }

    private long contarFramesDistintos(Long idVideo) {
        Long resultado = jdbcTemplate.queryForObject(
                "SELECT COUNT(DISTINCT frame_numero) FROM DETECCIONES WHERE id_video = ?",
                Long.class, idVideo);
        return resultado != null ? resultado : 0L;
    }

    private Map<Long, ZoneAgg> obtenerAgregadosPorZona(Long idVideo) {
        Map<Long, ZoneAgg> mapa = new HashMap<>();
        jdbcTemplate.query(
                "SELECT id_zona, COUNT(*) AS total, COUNT(DISTINCT frame_numero) AS frames_activos, " +
                "AVG(confianza) AS conf_prom " +
                "FROM DETECCIONES " +
                "WHERE id_video = ? AND id_zona IS NOT NULL " +
                "GROUP BY id_zona",
                (RowCallbackHandler) rs -> {
                    long idZona = rs.getLong("id_zona");
                    long total = rs.getLong("total");
                    long framesActivos = rs.getLong("frames_activos");
                    BigDecimal confProm = rs.getBigDecimal("conf_prom");
                    if (confProm == null) confProm = BigDecimal.ZERO;
                    mapa.put(idZona, new ZoneAgg(total, framesActivos,
                            confProm.setScale(3, RoundingMode.HALF_UP)));
                }, idVideo);
        return mapa;
    }

    private Map<Long, Integer> obtenerPicoMaximoPorZona(Long idVideo) {
        Map<Long, Integer> mapa = new HashMap<>();
        jdbcTemplate.query(
                "SELECT id_zona, MAX(cnt) AS pico " +
                "FROM (SELECT id_zona, frame_numero, COUNT(*) AS cnt " +
                "      FROM DETECCIONES " +
                "      WHERE id_video = ? AND id_zona IS NOT NULL " +
                "      GROUP BY id_zona, frame_numero) sub " +
                "GROUP BY id_zona",
                (RowCallbackHandler) rs -> mapa.put(rs.getLong("id_zona"), rs.getInt("pico")),
                idVideo);
        return mapa;
    }

    // ── Cálculo de métricas ────────────────────────────────────────────────

    private BigDecimal calcPorcentaje(long totalZona, long totalVideo) {
        if (totalVideo == 0) return BigDecimal.ZERO.setScale(2);
        return BigDecimal.valueOf(totalZona)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalVideo), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal calcDensidad(long totalZona, long totalFrames) {
        if (totalFrames == 0) return BigDecimal.ZERO.setScale(4);
        return BigDecimal.valueOf(totalZona)
                .divide(BigDecimal.valueOf(totalFrames), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcDensidadPorArea(long totalZona, BigDecimal areaZona) {
        if (areaZona.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO.setScale(4);
        return BigDecimal.valueOf(totalZona)
                .divide(areaZona, 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcIndice(long totalZona, long totalVideo, int numZonas) {
        if (totalVideo == 0 || numZonas == 0) return BigDecimal.ZERO.setScale(3);
        // indice = totalZona / (totalVideo / numZonas)
        BigDecimal promedioPorZona = BigDecimal.valueOf(totalVideo)
                .divide(BigDecimal.valueOf(numZonas), 6, RoundingMode.HALF_UP);
        if (promedioPorZona.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO.setScale(3);
        return BigDecimal.valueOf(totalZona)
                .divide(promedioPorZona, 3, RoundingMode.HALF_UP);
    }

    // ── Tipo interno ─────────────────────────────────────────────────────

    private record ZoneAgg(long total, long framesActivos, BigDecimal confProm) {
        static final ZoneAgg EMPTY = new ZoneAgg(0L, 0L, BigDecimal.ZERO.setScale(3));
    }
}
