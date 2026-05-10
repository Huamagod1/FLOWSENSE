package cl.duoc.flowsense.videos.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DeteccionHeatmapPoint {

    private BigDecimal x;
    private BigDecimal y;
    private Long zonaId;
}
