package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.videos.dto.FramePreviewResponse;
import cl.duoc.flowsense.videos.dto.GuardarZonasYProcesarRequest;
import cl.duoc.flowsense.videos.dto.ResumenAnalisisResponse;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
