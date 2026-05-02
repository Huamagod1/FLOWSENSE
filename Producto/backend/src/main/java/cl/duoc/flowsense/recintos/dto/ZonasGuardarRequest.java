package cl.duoc.flowsense.recintos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ZonasGuardarRequest {

    @NotNull
    @Valid
    private List<ZonaRequest> zonas;
}
