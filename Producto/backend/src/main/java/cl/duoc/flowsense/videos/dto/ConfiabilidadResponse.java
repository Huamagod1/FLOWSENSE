package cl.duoc.flowsense.videos.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConfiabilidadResponse {
    private Double confianzaPromedio;
    private Double calidadTracking;
    private Double scoreConfiabilidad;
    private String nivelConfiabilidad;
    private Boolean overlayDisponible;
    private Boolean videoOriginalDisponible;
}
