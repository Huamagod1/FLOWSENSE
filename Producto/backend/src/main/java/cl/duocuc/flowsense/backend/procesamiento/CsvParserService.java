package cl.duocuc.flowsense.backend.procesamiento;

import cl.duocuc.flowsense.backend.videos.Deteccion;
import cl.duocuc.flowsense.backend.videos.Video;
import cl.duocuc.flowsense.backend.recintos.Zona;
import cl.duocuc.flowsense.backend.recintos.ZonaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CsvParserService {
    private final ZonaRepository zonaRepository;

    public List<Deteccion> parseDetecciones(String csvPath, Video video) {
        List<Deteccion> detecciones = new ArrayList<>();
        Map<Long, Zona> zonasMap = zonaRepository.findByRecintoId(video.getRecinto().getId())
                .stream()
                .collect(Collectors.toMap(Zona::getId, Function.identity()));

        try (BufferedReader br = new BufferedReader(new FileReader(csvPath))) {
            String line;
            // Saltar cabecera si existe (depende de cómo Python lo genere)
            br.readLine(); 

            while ((line = br.readLine()) != null) {
                String[] values = line.split(",");
                if (values.length >= 5) {
                    try {
                        Long zonaId = Long.parseLong(values[0]);
                        Zona zona = zonasMap.get(zonaId);
                        
                        if (zona != null) {
                            Deteccion deteccion = Deteccion.builder()
                                    .video(video)
                                    .zona(zona)
                                    .frameNumero(Integer.parseInt(values[1]))
                                    .xCentroNorm(new BigDecimal(values[2]))
                                    .yCentroNorm(new BigDecimal(values[3]))
                                    .confianza(new BigDecimal(values[4]))
                                    .build();
                            detecciones.add(deteccion);
                        }
                    } catch (Exception e) {
                        log.warn("Error parseando línea de CSV: {}", line);
                    }
                }
            }
        } catch (IOException e) {
            log.error("Error leyendo archivo CSV: {}", csvPath, e);
        }

        return detecciones;
    }
}
