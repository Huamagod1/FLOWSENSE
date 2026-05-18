package cl.duoc.flowsense.procesamiento;

import cl.duoc.flowsense.videos.Video;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CsvParserService {

    private static final Logger log = LoggerFactory.getLogger(CsvParserService.class);
    private static final int BATCH_SIZE = 500;

    // Formato nuevo (8 col): id_video, frame_numero, zona_id, track_id, x, y, conf, detenida
    private static final String INSERT_SQL =
            "INSERT INTO DETECCIONES (id_video, id_zona, frame_numero, x_centro_norm, y_centro_norm, confianza, detenida, track_id) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    private static final int[] TIPOS = {
            Types.BIGINT, Types.BIGINT, Types.INTEGER,
            Types.DECIMAL, Types.DECIMAL, Types.DECIMAL, Types.BOOLEAN,
            Types.INTEGER
    };

    private final JdbcTemplate jdbcTemplate;

    public CsvParserService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public int parsearYPersistir(Path csvPath, Video video, Map<Integer, Long> mapaZonas) throws IOException {
        List<Object[]> lote = new ArrayList<>(BATCH_SIZE);
        int totalInsertadas = 0;
        int fila = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath)) {
            reader.readLine(); // salta encabezado

            String linea;
            while ((linea = reader.readLine()) != null) {
                fila++;
                String[] cols = linea.split(",", -1);

                // 7 columnas = formato antiguo (sin track_id); 8 = nuevo
                boolean formatoNuevo = cols.length >= 8;
                if (cols.length < 7) {
                    log.warn("CSV fila {} inválida (columnas insuficientes), se omite: {}", fila, linea);
                    continue;
                }

                try {
                    int frameNumero = Integer.parseInt(cols[1].trim());
                    Long idZona = resolverIdZona(cols[2].trim(), mapaZonas);

                    int trackId;
                    double x, y, conf;
                    boolean detenida;

                    if (formatoNuevo) {
                        trackId = Integer.parseInt(cols[3].trim());
                        x       = Double.parseDouble(cols[4].trim());
                        y       = Double.parseDouble(cols[5].trim());
                        conf    = Double.parseDouble(cols[6].trim());
                        detenida = Boolean.parseBoolean(cols[7].trim());
                    } else {
                        trackId = -1;
                        x       = Double.parseDouble(cols[3].trim());
                        y       = Double.parseDouble(cols[4].trim());
                        conf    = Double.parseDouble(cols[5].trim());
                        detenida = Boolean.parseBoolean(cols[6].trim());
                    }

                    lote.add(new Object[]{video.getId(), idZona, frameNumero, x, y, conf, detenida, trackId});
                } catch (NumberFormatException e) {
                    log.warn("CSV fila {} con valor no parseable, se omite: {}", fila, linea);
                    continue;
                }

                if (lote.size() >= BATCH_SIZE) {
                    jdbcTemplate.batchUpdate(INSERT_SQL, lote, TIPOS);
                    totalInsertadas += lote.size();
                    lote.clear();
                }
            }

            if (!lote.isEmpty()) {
                jdbcTemplate.batchUpdate(INSERT_SQL, lote, TIPOS);
                totalInsertadas += lote.size();
            }
        }

        log.info("CSV parseado para video {}: {} detecciones insertadas ({} filas leídas)",
                video.getId(), totalInsertadas, fila);
        return totalInsertadas;
    }

    private Long resolverIdZona(String zonaIdStr, Map<Integer, Long> mapaZonas) {
        if (zonaIdStr.isEmpty() || zonaIdStr.equalsIgnoreCase("null")
                || zonaIdStr.equalsIgnoreCase("none")) {
            return null;
        }
        try {
            int pyIdx = Integer.parseInt(zonaIdStr);
            return mapaZonas.get(pyIdx);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
