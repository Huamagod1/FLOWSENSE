package cl.duocuc.flowsense.backend.recintos.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ZonaResponse {
    private Long id;
    private String nombre;
    private BigDecimal x;
    private BigDecimal y;
    private BigDecimal ancho;
    private BigDecimal alto;
    private String colorHex;
}
