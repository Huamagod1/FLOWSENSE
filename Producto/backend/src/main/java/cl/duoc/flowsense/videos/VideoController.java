package cl.duoc.flowsense.videos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.videos.dto.VideoResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/recintos/{idRecinto}/videos")
public class VideoController {

    private final VideoService videoService;
    private final CurrentUser currentUser;

    public VideoController(VideoService videoService, CurrentUser currentUser) {
        this.videoService = videoService;
        this.currentUser = currentUser;
    }

    @PostMapping
    public ResponseEntity<VideoResponse> subir(
            @PathVariable Long idRecinto,
            @RequestParam("archivo") MultipartFile archivo) {
        VideoResponse response = videoService.subirVideo(idRecinto, archivo, currentUser.getIdOrganizacion());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<VideoResponse>> listar(@PathVariable Long idRecinto) {
        List<VideoResponse> videos = videoService.listarPorRecinto(idRecinto, currentUser.getIdOrganizacion());
        return ResponseEntity.ok(videos);
    }
}
