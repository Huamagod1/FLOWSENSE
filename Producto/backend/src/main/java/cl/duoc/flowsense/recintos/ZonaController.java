package cl.duoc.flowsense.recintos;

import cl.duoc.flowsense.common.security.CurrentUser;
import cl.duoc.flowsense.recintos.dto.ZonaResponse;
import cl.duoc.flowsense.recintos.dto.ZonasGuardarRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recintos/{idRecinto}/zonas")
public class ZonaController {

    private final ZonaService zonaService;
    private final CurrentUser currentUser;

    public ZonaController(ZonaService zonaService, CurrentUser currentUser) {
        this.zonaService = zonaService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<List<ZonaResponse>> listar(@PathVariable Long idRecinto) {
        return ResponseEntity.ok(zonaService.listarPorRecinto(idRecinto, currentUser.getIdOrganizacion()));
    }

    @PutMapping
    public ResponseEntity<List<ZonaResponse>> guardar(@PathVariable Long idRecinto,
                                                       @Valid @RequestBody ZonasGuardarRequest request) {
        return ResponseEntity.ok(zonaService.guardarZonas(idRecinto, request, currentUser.getIdOrganizacion()));
    }
}
