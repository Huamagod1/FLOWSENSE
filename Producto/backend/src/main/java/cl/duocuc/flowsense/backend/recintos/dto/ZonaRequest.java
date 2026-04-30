package cl.duocuc.flowsense.backend.recintos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ZonaRequest {
    @NotBlank(message = "El nombre de la zona es obligatorio")
    private String nombre;

    @NotNull(message = "Coordenada X es obligatoria")
    private BigDecimal x;

    @NotNull(message = "Coordenada Y es obligatoria")
    private BigDecimal y;

    @NotNull(message = "Ancho es obligatorio")
    private BigDecimal ancho;

    @NotNull(message = "Alto es obligatorio")
    private BigDecimal alto;

    private String colorHex;
}
