package cl.duocuc.flowsense.backend.recintos;

import cl.duocuc.flowsense.backend.recintos.dto.RecintoRequest;
import cl.duocuc.flowsense.backend.recintos.dto.RecintoResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recintos")
@RequiredArgsConstructor
public class RecintoController {
    private final RecintoService recintoService;

    @GetMapping
    public ResponseEntity<List<RecintoResponse>> listarTodos() {
        return ResponseEntity.ok(recintoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecintoResponse> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(recintoService.obtenerPorId(id));
    }

    @PostMapping
    public ResponseEntity<RecintoResponse> crear(@Valid @RequestBody RecintoRequest request) {
        return ResponseEntity.ok(recintoService.crear(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecintoResponse> actualizar(@PathVariable Long id, @Valid @RequestBody RecintoRequest request) {
        return ResponseEntity.ok(recintoService.actualizar(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        recintoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
