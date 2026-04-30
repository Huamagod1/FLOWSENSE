package cl.duocuc.flowsense.backend.procesamiento;

import cl.duocuc.flowsense.backend.videos.Deteccion;
import cl.duocuc.flowsense.backend.videos.Metrica;
import cl.duocuc.flowsense.backend.videos.Video;
import cl.duocuc.flowsense.backend.recintos.Zona;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MetricasCalculatorService {

    public List<Metrica> calcularMetricas(Video video, List<Deteccion> detecciones) {
        if (detecciones.isEmpty()) {
            return new ArrayList<>();
        }

        int totalDeteccionesVideo = detecciones.size();
        int framesProcesados = video.getFramesProcesados() != null ? video.getFramesProcesados() : 1;

        Map<Zona, List<Deteccion>> deteccionesPorZona = detecciones.stream()
                .collect(Collectors.groupingBy(Deteccion::getZona));

        return deteccionesPorZona.entrySet().stream().map(entry -> {
            Zona zona = entry.getKey();
            List<Deteccion> detZona = entry.getValue();
            int totalZona = detZona.size();

            // Frames con actividad
            long framesConActividad = detZona.stream()
                    .map(Deteccion::getFrameNumero)
                    .distinct()
                    .count();

            // Pico máximo (máximas detecciones en un mismo frame)
            int picoMaximo = detZona.stream()
                    .collect(Collectors.groupingBy(Deteccion::getFrameNumero, Collectors.counting()))
                    .values().stream()
                    .mapToInt(Long::intValue)
                    .max()
                    .orElse(0);

            // Confianza promedio
            double confianzaProm = detZona.stream()
                    .mapToDouble(d -> d.getConfianza().doubleValue())
                    .average()
                    .orElse(0.0);

            // Área de la zona (ancho * alto)
            BigDecimal area = zona.getAncho().multiply(zona.getAlto());

            return Metrica.builder()
                    .video(video)
                    .zona(zona)
                    .totalDetecciones(totalZona)
                    .porcentajeDelTotal(BigDecimal.valueOf(100.0 * totalZona / totalDeteccionesVideo).setScale(2, RoundingMode.HALF_UP))
                    .densidadPromedio(BigDecimal.valueOf((double) totalZona / framesProcesados).setScale(3, RoundingMode.HALF_UP))
                    .picoMaximo(picoMaximo)
                    .framesConActividad((int) framesConActividad)
                    .confianzaPromedio(BigDecimal.valueOf(confianzaProm).setScale(3, RoundingMode.HALF_UP))
                    .areaZona(area)
                    .densidadPorArea(area.compareTo(BigDecimal.ZERO) > 0 
                            ? BigDecimal.valueOf(totalZona).divide(area, 3, RoundingMode.HALF_UP) 
                            : BigDecimal.ZERO)
                    .calculadoAt(LocalDateTime.now())
                    .build();
        }).collect(Collectors.toList());
    }
}
