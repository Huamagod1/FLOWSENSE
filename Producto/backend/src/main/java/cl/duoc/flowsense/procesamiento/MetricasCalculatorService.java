package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.recintos.Zona;
import cl.duoc.flowsense.videos.Metrica;
import cl.duoc.flowsense.videos.MetricaRepository;
import cl.duoc.flowsense.videos.MetricaTemporal;
import cl.duoc.flowsense.videos.MetricaTemporalRepository;
import cl.duoc.flowsense.videos.Video;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MetricasCalculatorService {

    private static final Logger log = LoggerFactory.getLogger(MetricasCalculatorService.class);
    private static final int NUM_FRANJAS = 5;

    private final JdbcTemplate jdbcTemplate;
    private final MetricaRepository metricaRepository;
    private final MetricaTemporalRepository metricaTemporalRepository;

    public MetricasCalculatorService(JdbcTemplate jdbcTemplate,
                                     MetricaRepository metricaRepository,
                                     MetricaTemporalRepository metricaTemporalRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.metricaRepository = metricaRepository;
        this.metricaTemporalRepository = metricaTemporalRepository;
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
            BigDecimal densidadPorArea = calcDensidadPorArea(totalZona, areaZona);

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
                    .densidadPorArea(densidadPorArea)
                    .indiceValorRelativo(calcIndice(totalZona, totalVideo, numZonas))
                    .tasaDetencion(agg.tasaDetencion())
                    .build();

            metricas.add(m);
        }

        // Segunda pasada: score compuesto (requiere promedio cross-zona)
        BigDecimal avgDensidadPorArea = calcAvgDensidadPorArea(metricas);
        int totalFramesVideo = video.getFramesProcesados() != null ? video.getFramesProcesados() : 1;
        for (Metrica m : metricas) {
            m.setScoreCompuesto(calcScore(m, avgDensidadPorArea, totalFramesVideo));
        }

        List<Metrica> guardadas = metricaRepository.saveAll(metricas);

        calcularMetricasTemporales(video, zonas, guardadas);

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
                "AVG(confianza) AS conf_prom, " +
                "SUM(CASE WHEN detenida = 1 THEN 1 ELSE 0 END) AS sum_detenida " +
                "FROM DETECCIONES " +
                "WHERE id_video = ? AND id_zona IS NOT NULL " +
                "GROUP BY id_zona",
                (RowCallbackHandler) rs -> {
                    long idZona = rs.getLong("id_zona");
                    long total = rs.getLong("total");
                    long framesActivos = rs.getLong("frames_activos");
                    BigDecimal confProm = rs.getBigDecimal("conf_prom");
                    if (confProm == null) confProm = BigDecimal.ZERO;
                    long sumDetenida = rs.getLong("sum_detenida");
                    mapa.put(idZona, new ZoneAgg(total, framesActivos,
                            confProm.setScale(3, RoundingMode.HALF_UP), sumDetenida));
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

    // ── Métricas temporales ───────────────────────────────────────────────────

    private void calcularMetricasTemporales(Video video, List<Zona> zonas, List<Metrica> metricas) {
        Long idVideo = video.getId();
        metricaTemporalRepository.deleteByVideoId(idVideo);

        int totalFrames = video.getFramesProcesados() != null ? video.getFramesProcesados() : 0;
        if (totalFrames == 0 || zonas.isEmpty()) return;

        Map<Long, Integer> totalPorZona = metricas.stream()
                .collect(Collectors.toMap(m -> m.getZona().getId(), Metrica::getTotalDetecciones));

        int size = Math.max(1, totalFrames / NUM_FRANJAS);
        List<MetricaTemporal> temporales = new ArrayList<>();

        for (int i = 0; i < NUM_FRANJAS; i++) {
            int frameInicio = i * size;
            int frameFin = (i == NUM_FRANJAS - 1) ? totalFrames : (i + 1) * size;

            Map<Long, Integer> countPorZona = countDeteccionesEnFranja(idVideo, frameInicio, frameFin);

            for (Zona zona : zonas) {
                Long idZona = zona.getId();
                int count = countPorZona.getOrDefault(idZona, 0);
                int totalZona = totalPorZona.getOrDefault(idZona, 0);

                BigDecimal densidadRelativa = BigDecimal.ZERO.setScale(3);
                if (totalZona > 0) {
                    BigDecimal avgPorFranja = BigDecimal.valueOf(totalZona)
                            .divide(BigDecimal.valueOf(NUM_FRANJAS), 4, RoundingMode.HALF_UP);
                    if (avgPorFranja.compareTo(BigDecimal.ZERO) > 0) {
                        densidadRelativa = BigDecimal.valueOf(count)
                                .divide(avgPorFranja, 3, RoundingMode.HALF_UP);
                    }
                }

                temporales.add(MetricaTemporal.builder()
                        .video(video)
                        .zona(zona)
                        .franjaNumero(i)
                        .segundoInicio(frameInicio)
                        .segundoFin(frameFin)
                        .totalDetecciones(count)
                        .densidadRelativa(densidadRelativa)
                        .build());
            }
        }

        metricaTemporalRepository.saveAll(temporales);
        log.info("Métricas temporales para video {}: {} franjas × {} zonas",
                idVideo, NUM_FRANJAS, zonas.size());
    }

    private Map<Long, Integer> countDeteccionesEnFranja(Long idVideo, int frameInicio, int frameFin) {
        Map<Long, Integer> mapa = new HashMap<>();
        jdbcTemplate.query(
                "SELECT id_zona, COUNT(*) AS cnt FROM DETECCIONES " +
                "WHERE id_video = ? AND id_zona IS NOT NULL " +
                "  AND frame_numero >= ? AND frame_numero < ? " +
                "GROUP BY id_zona",
                (RowCallbackHandler) rs -> mapa.put(rs.getLong("id_zona"), rs.getInt("cnt")),
                idVideo, frameInicio, frameFin);
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
        BigDecimal promedioPorZona = BigDecimal.valueOf(totalVideo)
                .divide(BigDecimal.valueOf(numZonas), 6, RoundingMode.HALF_UP);
        if (promedioPorZona.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO.setScale(3);
        return BigDecimal.valueOf(totalZona)
                .divide(promedioPorZona, 3, RoundingMode.HALF_UP);
    }

    private BigDecimal calcAvgDensidadPorArea(List<Metrica> metricas) {
        if (metricas.isEmpty()) return BigDecimal.ZERO;
        BigDecimal sum = metricas.stream()
                .map(Metrica::getDensidadPorArea)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(metricas.size()), 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calcScore(Metrica m, BigDecimal avgDensidadPorArea, int totalFramesVideo) {
        // indice_valor_relativo ya está normalizado (zona / promedio_zona = 1.0 base)
        BigDecimal indice = m.getIndiceValorRelativo();

        BigDecimal tasa = m.getTasaDetencion() != null ? m.getTasaDetencion() : BigDecimal.ZERO;

        BigDecimal densNorm = BigDecimal.ZERO.setScale(4);
        if (avgDensidadPorArea.compareTo(BigDecimal.ZERO) > 0) {
            densNorm = m.getDensidadPorArea()
                    .divide(avgDensidadPorArea, 4, RoundingMode.HALF_UP);
        }

        BigDecimal consistencia = BigDecimal.ZERO.setScale(4);
        if (totalFramesVideo > 0) {
            consistencia = BigDecimal.valueOf(m.getFramesConActividad())
                    .divide(BigDecimal.valueOf(totalFramesVideo), 4, RoundingMode.HALF_UP);
        }

        return BigDecimal.valueOf(0.40).multiply(indice)
                .add(BigDecimal.valueOf(0.30).multiply(tasa))
                .add(BigDecimal.valueOf(0.20).multiply(densNorm))
                .add(BigDecimal.valueOf(0.10).multiply(consistencia))
                .setScale(3, RoundingMode.HALF_UP);
    }

    // ── Tipo interno ─────────────────────────────────────────────────────

    private record ZoneAgg(long total, long framesActivos, BigDecimal confProm, long sumDetenida) {
        static final ZoneAgg EMPTY = new ZoneAgg(0L, 0L, BigDecimal.ZERO.setScale(3), 0L);

        BigDecimal tasaDetencion() {
            if (total == 0) return BigDecimal.ZERO.setScale(4);
            return BigDecimal.valueOf(sumDetenida)
                    .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP);
        }
    }
}
