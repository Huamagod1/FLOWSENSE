package cl.duocuc.flowsense.backend.videos;

import cl.duocuc.flowsense.backend.videos.dto.VideoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/videos")
@RequiredArgsConstructor
public class VideoController {
    private final VideoService videoService;

    @GetMapping("/recinto/{recintoId}")
    public ResponseEntity<List<VideoResponse>> listarPorRecinto(@PathVariable Long recintoId) {
        return ResponseEntity.ok(videoService.listarPorRecinto(recintoId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VideoResponse> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(videoService.obtenerPorId(id));
    }

    @PostMapping("/upload/recinto/{recintoId}")
    public ResponseEntity<VideoResponse> subirVideo(
            @PathVariable Long recintoId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return ResponseEntity.status(201).body(videoService.subirVideo(recintoId, file));
    }

    @PostMapping("/{id}/procesar")
    public ResponseEntity<Void> iniciarProcesamiento(@PathVariable Long id) throws IOException {
        videoService.iniciarProcesamiento(id);
        return ResponseEntity.accepted().build();
    }
}
