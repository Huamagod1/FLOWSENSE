package cl.duoc.flowsense.videos.dto;

import cl.duoc.flowsense.recintos.dto.ZonaRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class GuardarZonasYProcesarRequest {

    @NotNull
    @Valid
    @Size(min = 1, max = 20, message = "Se requiere entre 1 y 20 zonas")
    private List<ZonaRequest> zonas;
}
