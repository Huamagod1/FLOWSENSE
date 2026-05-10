package cl.duoc.flowsense.recintos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.recintos.dto.RecintoRequest;
import cl.duoc.flowsense.recintos.dto.RecintoResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recintos")
public class RecintoController {

    private final RecintoService recintoService;
    private final CurrentUser currentUser;

    public RecintoController(RecintoService recintoService, CurrentUser currentUser) {
        this.recintoService = recintoService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<List<RecintoResponse>> listar() {
        return ResponseEntity.ok(recintoService.listar(currentUser.getIdOrganizacion()));
    }

    @PostMapping
    public ResponseEntity<RecintoResponse> crear(@Valid @RequestBody RecintoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recintoService.crear(request, currentUser.getIdOrganizacion()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecintoResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(recintoService.obtener(id, currentUser.getIdOrganizacion()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecintoResponse> actualizar(@PathVariable Long id,
                                                       @Valid @RequestBody RecintoRequest request) {
        return ResponseEntity.ok(recintoService.actualizar(id, request, currentUser.getIdOrganizacion()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        recintoService.desactivar(id, currentUser.getIdOrganizacion());
        return ResponseEntity.noContent().build();
    }
}
