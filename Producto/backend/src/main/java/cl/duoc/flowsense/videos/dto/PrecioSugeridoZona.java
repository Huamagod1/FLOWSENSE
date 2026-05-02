package cl.duoc.flowsense.videos.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PrecioSugeridoZona {

    private Long idZona;
    private String nombreZona;
    private BigDecimal indiceValorRelativo;
    private Integer precioSugeridoClp;
}
