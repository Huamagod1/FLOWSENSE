package cl.duoc.flowsense.recintos.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ZonaRequest {

    @NotBlank
    @Size(max = 100)
    private String nombre;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "El color debe tener formato #RRGGBB")
    private String colorHex;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal xNorm;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal yNorm;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal anchoNorm;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal altoNorm;

    @Min(0)
    private int orden;
}
