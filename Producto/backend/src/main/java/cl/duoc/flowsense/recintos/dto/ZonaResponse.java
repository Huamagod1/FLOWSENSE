package cl.duoc.flowsense.recintos.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ZonaResponse {

    private Long id;
    private Long idRecinto;
    private String nombre;
    private String colorHex;
    private BigDecimal xNorm;
    private BigDecimal yNorm;
    private BigDecimal anchoNorm;
    private BigDecimal altoNorm;
    private int orden;
    private LocalDateTime fechaCreacion;
}
