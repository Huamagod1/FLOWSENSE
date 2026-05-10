package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.videos.dto.DeteccionHeatmapPoint;
import cl.duoc.flowsense.videos.dto.EstadoVideoResponse;
import cl.duoc.flowsense.videos.dto.FramePreviewResponse;
import cl.duoc.flowsense.videos.dto.GuardarZonasYProcesarRequest;
import cl.duoc.flowsense.videos.dto.MetricaResponse;
import cl.duoc.flowsense.videos.dto.MetricaTemporalResponse;
import cl.duoc.flowsense.videos.dto.PrecioSugeridoRequest;
import cl.duoc.flowsense.videos.dto.PrecioSugeridoZona;
import cl.duoc.flowsense.videos.dto.ResumenAnalisisResponse;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideoQueryController {

    private final VideoService videoService;
    private final AnalisisService analisisService;
    private final CurrentUser currentUser;

    public VideoQueryController(VideoService videoService,
                                AnalisisService analisisService,
                                CurrentUser currentUser) {
        this.videoService = videoService;
        this.analisisService = analisisService;
        this.currentUser = currentUser;
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.obtener(id, currentUser.getIdOrganizacion()));
    }

    // ── Grupo 1a ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/estado")
    public ResponseEntity<EstadoVideoResponse> estado(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.obtenerEstado(id, currentUser.getIdOrganizacion()));
    }

    // ── Grupo 1b ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/metricas")
    public ResponseEntity<List<MetricaResponse>> metricas(@PathVariable Long id) {
        return ResponseEntity.ok(analisisService.obtenerMetricas(id, currentUser.getIdOrganizacion()));
    }

    // ── Grupo 1c ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/detecciones")
    public ResponseEntity<List<DeteccionHeatmapPoint>> detecciones(@PathVariable Long id) {
        return ResponseEntity.ok(
                videoService.listarDeteccionesHeatmap(id, currentUser.getIdOrganizacion()));
    }

    // ── Grupo 1d ─────────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        videoService.eliminar(id, currentUser.getIdOrganizacion());
        return ResponseEntity.noContent().build();
    }

    // ── Frame preview ─────────────────────────────────────────────────────────

    @GetMapping("/{id}/frame-preview")
    public ResponseEntity<FramePreviewResponse> framePreview(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.obtenerFramePreview(id, currentUser.getIdOrganizacion()));
    }

    @GetMapping("/{id}/frame-preview/imagen")
    public ResponseEntity<byte[]> servirImagen(@PathVariable Long id) {
        byte[] imagen = videoService.servirImagenFrame(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(imagen);
    }

    // ── Análisis ──────────────────────────────────────────────────────────────

    @PutMapping("/{id}/analisis")
    public ResponseEntity<VideoResponse> guardarZonasYProcesar(
            @PathVariable Long id,
            @Valid @RequestBody GuardarZonasYProcesarRequest request) {
        return ResponseEntity.ok(
                analisisService.guardarZonasYProcesar(id, request, currentUser.getIdOrganizacion()));
    }

    @GetMapping("/{id}/resumen")
    public ResponseEntity<ResumenAnalisisResponse> resumen(@PathVariable Long id) {
        return ResponseEntity.ok(analisisService.obtenerResumen(id, currentUser.getIdOrganizacion()));
    }

    // ── Grupo 3 ───────────────────────────────────────────────────────────────

    @GetMapping("/{id}/metricas-temporales")
    public ResponseEntity<List<MetricaTemporalResponse>> metricasTemporales(@PathVariable Long id) {
        return ResponseEntity.ok(
                analisisService.obtenerMetricasTemporales(id, currentUser.getIdOrganizacion()));
    }

    @PostMapping("/{id}/precio-sugerido")
    public ResponseEntity<List<PrecioSugeridoZona>> precioSugerido(
            @PathVariable Long id,
            @Valid @RequestBody PrecioSugeridoRequest request) {
        return ResponseEntity.ok(
                analisisService.calcularPrecioSugeridoConScore(
                        id, currentUser.getIdOrganizacion(), request.getPrecioBase()));
    }
}
