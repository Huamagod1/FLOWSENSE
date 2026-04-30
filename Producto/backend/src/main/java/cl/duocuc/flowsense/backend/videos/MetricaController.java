package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.common.security.CurrentUser;
import cl.duocuc.flowsense.backend.videos.dto.MetricaResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/videos/{videoId}/metricas")
@RequiredArgsConstructor
public class MetricaController {
    private final MetricaRepository metricaRepository;
    private final VideoRepository videoRepository;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<List<MetricaResponse>> obtenerMetricas(@PathVariable Long videoId) {
        // Verificar pertenencia
        videoRepository.findByIdAndRecintoOrganizacionId(videoId, currentUser.getOrganizacionId())
                .orElseThrow(() -> new RuntimeException("Video no encontrado"));

        List<MetricaResponse> responses = metricaRepository.findByVideoId(videoId)
                .stream()
                .map(m -> MetricaResponse.builder()
                        .id(m.getId())
                        .zonaId(m.getZona().getId())
                        .nombreZona(m.getZona().getNombre())
                        .totalDetecciones(m.getTotalDetecciones())
                        .porcentajeDelTotal(m.getPorcentajeDelTotal())
                        .densidadPromedio(m.getDensidadPromedio())
                        .picoMaximo(m.getPicoMaximo())
                        .framesConActividad(m.getFramesConActividad())
                        .confianzaPromedio(m.getConfianzaPromedio())
                        .areaZona(m.getAreaZona())
                        .densidadPorArea(m.getDensidadPorArea())
                        .indiceValorRelativo(m.getIndiceValorRelativo())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }
}
