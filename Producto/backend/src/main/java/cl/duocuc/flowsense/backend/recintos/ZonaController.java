package cl.duocuc.flowsense.backend.recintos;

import cl.duocuc.flowsense.backend.recintos.dto.ZonaRequest;
import cl.duocuc.flowsense.backend.recintos.dto.ZonaResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recintos/{recintoId}/zonas")
@RequiredArgsConstructor
public class ZonaController {
    private final ZonaService zonaService;

    @GetMapping
    public ResponseEntity<List<ZonaResponse>> listarPorRecinto(@PathVariable Long recintoId) {
        return ResponseEntity.ok(zonaService.listarPorRecinto(recintoId));
    }

    @PostMapping
    public ResponseEntity<ZonaResponse> crear(@PathVariable Long recintoId, @Valid @RequestBody ZonaRequest request) {
        return ResponseEntity.ok(zonaService.crear(recintoId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long recintoId, @PathVariable Long id) {
        zonaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
