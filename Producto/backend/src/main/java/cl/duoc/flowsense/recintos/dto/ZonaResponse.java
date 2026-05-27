package cl.duoc.flowsense.recintos.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("xNorm")
    private BigDecimal xNorm;

    @JsonProperty("yNorm")
    private BigDecimal yNorm;

    @JsonProperty("anchoNorm")
    private BigDecimal anchoNorm;

    @JsonProperty("altoNorm")
    private BigDecimal altoNorm;

    private int orden;
    private LocalDateTime fechaCreacion;
}
