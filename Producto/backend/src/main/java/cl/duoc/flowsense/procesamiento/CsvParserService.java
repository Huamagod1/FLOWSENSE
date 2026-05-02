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
    private static final String INSERT_SQL =
            "INSERT INTO DETECCIONES (id_video, id_zona, frame_numero, x_centro_norm, y_centro_norm, confianza) " +
            "VALUES (?, ?, ?, ?, ?, ?)";
    private static final int[] TIPOS = {
            Types.BIGINT, Types.BIGINT, Types.INTEGER, Types.DECIMAL, Types.DECIMAL, Types.DECIMAL
    };

    private final JdbcTemplate jdbcTemplate;

    public CsvParserService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // CSV esperado: id_video,frame_numero,zona_id,x_centro_norm,y_centro_norm,confianza
    // zona_id es el índice 0-based que Python asignó; mapaZonas lo traduce al id real de BD.
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
                if (cols.length < 6) {
                    log.warn("CSV fila {} inválida (columnas insuficientes), se omite: {}", fila, linea);
                    continue;
                }

                try {
                    int frameNumero = Integer.parseInt(cols[1].trim());
                    Long idZona = resolverIdZona(cols[2].trim(), mapaZonas);
                    double x = Double.parseDouble(cols[3].trim());
                    double y = Double.parseDouble(cols[4].trim());
                    double conf = Double.parseDouble(cols[5].trim());

                    lote.add(new Object[]{video.getId(), idZona, frameNumero, x, y, conf});
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
