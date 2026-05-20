package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.recintos.ZonaService;
import cl.duoc.flowsense.recintos.dto.ZonaRequest;
import cl.duoc.flowsense.recintos.dto.ZonaResponse;
import cl.duoc.flowsense.recintos.dto.ZonasGuardarRequest;
import cl.duoc.flowsense.procesamiento.TrackingMetricsService;
import cl.duoc.flowsense.videos.dto.ConfiabilidadResponse;
import cl.duoc.flowsense.videos.dto.DeteccionHeatmapPoint;
import cl.duoc.flowsense.videos.dto.EstadoVideoResponse;
import cl.duoc.flowsense.videos.dto.EventosResponse;
import cl.duoc.flowsense.videos.dto.FlujoZonasDto;
import cl.duoc.flowsense.videos.dto.FramePreviewResponse;
import cl.duoc.flowsense.videos.dto.GuardarZonasYProcesarRequest;
import cl.duoc.flowsense.videos.dto.MetricaResponse;
import cl.duoc.flowsense.videos.dto.MetricaTemporalResponse;
import cl.duoc.flowsense.videos.dto.MetricaTrackingResponse;
import cl.duoc.flowsense.videos.dto.PrecioSugeridoRequest;
import cl.duoc.flowsense.videos.dto.PrecioSugeridoZona;
import cl.duoc.flowsense.videos.dto.ResumenAnalisisResponse;
import cl.duoc.flowsense.videos.dto.TrackDto;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/videos")
public class VideoQueryController {

    private final VideoService videoService;
    private final AnalisisService analisisService;
    private final ZonaService zonaService;
    private final TrackingMetricsService trackingMetricsService;
    private final CurrentUser currentUser;

    public VideoQueryController(VideoService videoService,
                                AnalisisService analisisService,
                                ZonaService zonaService,
                                TrackingMetricsService trackingMetricsService,
                                CurrentUser currentUser) {
        this.videoService = videoService;
        this.analisisService = analisisService;
        this.zonaService = zonaService;
        this.trackingMetricsService = trackingMetricsService;
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

    // ── Zonas ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/zonas")
    public ResponseEntity<List<ZonaResponse>> zonas(@PathVariable Long id) {
        VideoResponse video = videoService.obtener(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok(zonaService.listarPorRecinto(video.getIdRecinto(), currentUser.getIdOrganizacion()));
    }

    @PutMapping("/{id}/zonas")
    public ResponseEntity<List<ZonaResponse>> guardarZonas(
            @PathVariable Long id,
            @RequestBody List<ZonaRequest> zonas) {
        VideoResponse video = videoService.obtener(id, currentUser.getIdOrganizacion());
        ZonasGuardarRequest request = new ZonasGuardarRequest();
        request.setZonas(zonas);
        return ResponseEntity.ok(zonaService.guardarZonas(video.getIdRecinto(), request, currentUser.getIdOrganizacion()));
    }

    @PostMapping("/{id}/zonas/confirmar")
    public ResponseEntity<VideoResponse> confirmarZonas(@PathVariable Long id) {
        return ResponseEntity.ok(analisisService.confirmarYProcesar(id, currentUser.getIdOrganizacion()));
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

    // ── Tracking ──────────────────────────────────────────────────────────────

    @GetMapping("/{id}/tracks")
    public ResponseEntity<List<TrackDto>> tracks(@PathVariable Long id) {
        videoService.obtener(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok(trackingMetricsService.listarTracks(id));
    }

    @GetMapping("/{id}/flujo-zonas")
    public ResponseEntity<List<FlujoZonasDto>> flujoZonas(@PathVariable Long id) {
        videoService.obtener(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok(trackingMetricsService.listarFlujoZonas(id));
    }

    @GetMapping("/{id}/metricas-tracking")
    public ResponseEntity<List<MetricaTrackingResponse>> metricasTracking(@PathVariable Long id) {
        videoService.obtener(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok(trackingMetricsService.listarMetricasTracking(id));
    }

    @PostMapping("/{id}/precio-sugerido")
    public ResponseEntity<List<PrecioSugeridoZona>> precioSugerido(
            @PathVariable Long id,
            @Valid @RequestBody PrecioSugeridoRequest request) {
        return ResponseEntity.ok(
                analisisService.calcularPrecioSugeridoConScore(
                        id, currentUser.getIdOrganizacion(), request.getPrecioBase()));
    }

    // ── Validación del análisis ───────────────────────────────────────────────

    @GetMapping("/{id}/confiabilidad")
    public ResponseEntity<ConfiabilidadResponse> confiabilidad(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.obtenerConfiabilidad(id, currentUser.getIdOrganizacion()));
    }

    @GetMapping("/{id}/video-overlay")
    public ResponseEntity<Resource> videoOverlay(@PathVariable Long id) {
        Resource resource = videoService.servirVideoOverlay(id, currentUser.getIdOrganizacion());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/mp4"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"overlay.mp4\"")
                .body(resource);
    }

    @GetMapping("/{id}/eventos")
    public ResponseEntity<EventosResponse> eventos(
            @PathVariable Long id,
            @RequestParam(required = false) Integer desde,
            @RequestParam(required = false) Integer hasta) {
        return ResponseEntity.ok(
                videoService.obtenerEventos(id, currentUser.getIdOrganizacion(), desde, hasta));
    }

    @DeleteMapping("/{id}/video-original")
    public ResponseEntity<Void> eliminarVideoOriginal(@PathVariable Long id) {
        videoService.eliminarVideoOriginal(id, currentUser.getIdOrganizacion());
        return ResponseEntity.noContent().build();
    }
}
